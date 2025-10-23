import { Elysia } from 'elysia'

console.log('[TEST] Creating minimal Elysia app')

const app = new Elysia()
  .get('/', () => 'Hello World')

console.log('[TEST] About to listen on port 4000')

app.listen(4000)

console.log('[TEST] Server started:', app.server?.hostname, app.server?.port)
