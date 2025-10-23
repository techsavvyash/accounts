import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { bearer } from '@elysiajs/bearer'
import { config } from './src/config'

console.log('[TEST] Creating Elysia app with plugins')

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
  .get('/health', () => ({ status: 'ok' }))

console.log('[TEST] About to listen on port 6969')

app.listen(6969)

console.log('[TEST] Server started on port 6969')
