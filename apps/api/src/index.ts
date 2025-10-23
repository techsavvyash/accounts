import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { bearer } from '@elysiajs/bearer'

import { heimdallAuthRoutes } from './routes/heimdall-auth'
import { productRoutes } from './routes/products'
import { inventoryRoutes } from './routes/inventory'
import { partyRoutes } from './routes/parties'
import { invoiceRoutes } from './routes/invoices'
import { ledgerRoutes } from './routes/ledger'
import { gstRoutes } from './routes/gst'
import { analyticsRoutes } from './routes/analytics'
import { reportRoutes } from './routes/reports'
import { webhooksRoutes } from './routes/webhooks'
import { creditDebitNoteRoutes } from './routes/credit-debit-notes'

import { errorHandler } from './middleware/error-handler'
import { heimdallAuthMiddleware } from './middleware/heimdall-auth'
import { posthogMiddleware } from './middleware/posthog'
import { config } from './config'
import { startWebhookManager } from './services/webhook'

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Business Accounts Management API',
          version: '1.0.0',
          description: 'API for managing business accounts with Heimdall authentication'
        },
        tags: [
          { name: 'Auth', description: 'Authentication endpoints (Heimdall)' },
          { name: 'Products', description: 'Product management' },
          { name: 'Inventory', description: 'Inventory operations' },
          { name: 'Parties', description: 'Customer and vendor management' },
          { name: 'Invoices', description: 'Invoice operations' },
          { name: 'Credit/Debit Notes', description: 'Credit and debit note management' },
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
  .use(bearer())  // Add bearer token plugin
  .onError(errorHandler)
  .derive(posthogMiddleware)
  .group('/api', (app) =>
    app
      .use(heimdallAuthRoutes)
      .guard(
        {
          beforeHandle: heimdallAuthMiddleware
        },
        (app) =>
          app
            .use(productRoutes)
            .use(inventoryRoutes)
            .use(partyRoutes)
            .use(invoiceRoutes)
            .use(creditDebitNoteRoutes)
            .use(ledgerRoutes)
            .use(gstRoutes)
            .use(analyticsRoutes)
            .use(reportRoutes)
            .use(webhooksRoutes)
      )
  )
  .get('/health', () => ({
    status: 'healthy',
    authProvider: 'heimdall',
    heimdallUrl: config.HEIMDALL_URL,
    timestamp: new Date().toISOString()
  }))

// Only start server if this file is being run directly (not imported)
if (import.meta.main) {
  app.listen({
    port: config.PORT,
    hostname: '0.0.0.0'
  })

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port} (Heimdall Auth)`
  )

  // TODO: Fix webhook manager double-start issue
  // startWebhookManager().catch(error => {
  //   console.error('Failed to start webhook manager:', error)
  // })
}

export default app
export type App = typeof app