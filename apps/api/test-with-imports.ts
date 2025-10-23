import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { bearer } from '@elysiajs/bearer'

console.log('[TEST] Importing middleware and services...')
import { errorHandler } from './src/middleware/error-handler'
import { heimdallAuthMiddleware } from './src/middleware/heimdall-auth'
import { posthogMiddleware } from './src/middleware/posthog'
import { config } from './src/config'
import { startWebhookManager } from './src/services/webhook'

console.log('[TEST] Creating Elysia app with middleware')

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
  .get('/health', () => ({ status: 'ok' }))

console.log('[TEST] About to listen on port 6969')

app.listen(6969)

console.log('[TEST] Server started on port 6969')
