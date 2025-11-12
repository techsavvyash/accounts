import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'

import { authRoutes } from './routes/auth'
import { productRoutes } from './routes/products'
import { inventoryRoutes } from './routes/inventory'
import { partyRoutes } from './routes/parties'
import { invoiceRoutes } from './routes/invoices'
import { ledgerRoutes } from './routes/ledger'
import { gstRoutes } from './routes/gst'
import { analyticsRoutes } from './routes/analytics'
import { reportRoutes } from './routes/reports'
import { webhooksRoutes } from './routes/webhooks'
import { seoRoutes } from './routes/seo'

import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'
import { posthogMiddleware } from './middleware/posthog'
import { encryptionContext, addEncryptionInfo } from './middleware/encryption'
import { initializeEncryption, setupTenantEncryption } from './services/encryption'
import { config } from './config'

// Initialize encryption system on startup
initializeEncryption()

// Setup encryption keys for existing tenants (run once)
if (process.env.SETUP_ENCRYPTION === 'true') {
  setupTenantEncryption()
    .then(() => console.log('✅ Tenant encryption setup complete'))
    .catch((err) => console.error('❌ Tenant encryption setup failed:', err))
}

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Business Accounts Management API',
          version: '1.0.0',
          description: 'API for managing business accounts, inventory, and GST compliance'
        },
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Products', description: 'Product management' },
          { name: 'Inventory', description: 'Inventory operations' },
          { name: 'Parties', description: 'Customer and vendor management' },
          { name: 'Invoices', description: 'Invoice operations' },
          { name: 'GST', description: 'GST compliance and returns' },
          { name: 'Analytics', description: 'Business analytics' },
          { name: 'Reports', description: 'Financial reports' },
          { name: 'Webhooks', description: 'Webhook management' }
        ]
      },
      path: '/api/docs'
    })
  )
  .use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true
  }))
  .use(cookie())
  .use(
    jwt({
      name: 'jwt',
      secret: config.JWT_SECRET,
      exp: config.JWT_EXPIRY
    })
  )
  .onError(errorHandler)
  .derive(posthogMiddleware)
  .derive(encryptionContext)
  // Public SEO routes (no auth required)
  .use(seoRoutes)
  .group('/api', (app) =>
    app
      .use(authRoutes)
      .guard(
        {
          beforeHandle: authMiddleware
        },
        (app) =>
          app
            .use(productRoutes)
            .use(inventoryRoutes)
            .use(partyRoutes)
            .use(invoiceRoutes)
            .use(ledgerRoutes)
            .use(gstRoutes)
            .use(analyticsRoutes)
            .use(reportRoutes)
            .use(webhooksRoutes)
      )
  )
  .get('/health', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    encryption: addEncryptionInfo()
  }))
  .listen(config.PORT)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)

export type App = typeof app