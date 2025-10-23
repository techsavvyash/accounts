import { Elysia } from 'elysia'

console.log('[TEST] Creating minimal Elysia app')

const app = new Elysia()
  .get('/health', () => ({ status: 'ok' }))

console.log('[TEST] About to listen on port 6969')

app.listen(6969)

console.log('[TEST] Server started on port 6969')
console.log(`[TEST] Server info: ${app.server?.hostname}:${app.server?.port}`)
