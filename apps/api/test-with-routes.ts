import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { bearer } from '@elysiajs/bearer'

console.log('[TEST] Importing routes...')
import { heimdallAuthRoutes } from './src/routes/heimdall-auth'
import { productRoutes } from './src/routes/products'
import { inventoryRoutes } from './src/routes/inventory'
import { partyRoutes } from './src/routes/parties'
import { invoiceRoutes } from './src/routes/invoices'
import { ledgerRoutes } from './src/routes/ledger'
import { gstRoutes } from './src/routes/gst'
import { analyticsRoutes } from './src/routes/analytics'
import { reportRoutes } from './src/routes/reports'
import { webhooksRoutes } from './src/routes/webhooks'

import { errorHandler } from './src/middleware/error-handler'
import { heimdallAuthMiddleware } from './src/middleware/heimdall-auth'
import { posthogMiddleware } from './src/middleware/posthog'
import { config } from './src/config'

console.log('[TEST] Creating Elysia app with all routes')

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'Test API',
        version: '1.0.0'
      }
    },
    path: '/api/docs'
  }))
  .use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true
  }))
  .use(bearer())
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
            .use(ledgerRoutes)
            .use(gstRoutes)
            .use(analyticsRoutes)
            .use(reportRoutes)
            .use(webhooksRoutes)
      )
  )
  .get('/health', () => ({ status: 'ok' }))

console.log('[TEST] About to listen on port 6969')

app.listen(6969)

console.log('[TEST] Server started on port 6969')
