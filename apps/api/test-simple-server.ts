import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { bearer } from '@elysiajs/bearer'
import { HeimdallClient } from '@techsavvyash/heimdall-sdk'

// Initialize Heimdall client
const heimdall = new HeimdallClient({
  apiUrl: process.env.HEIMDALL_URL || 'http://localhost:8080',
  tenantId: process.env.HEIMDALL_TENANT_ID,
  storage: {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.get(key) || null
    },
    setItem(key: string, value: string) {
      this.store.set(key, value)
    },
    removeItem(key: string) {
      this.store.delete(key)
    }
  },
  autoRefresh: false,
})

console.log('[TEST] Creating Elysia app with Heimdall')

const app = new Elysia()
  .use(cors({ credentials: true }))
  .use(bearer())

  .get('/health', () => ({
    status: 'healthy',
    authProvider: 'heimdall',
    timestamp: new Date().toISOString()
  }))

  .post('/api/auth/register', async ({ body, set }: any) => {
    try {
      const user = await heimdall.auth.register(body)
      const accessToken = await heimdall.auth.getAccessToken()

      return {
        success: true,
        data: { user, accessToken }
      }
    } catch (error: any) {
      set.status = error.statusCode || 500
      return {
        success: false,
        error: error.message || 'Registration failed'
      }
    }
  })

  .post('/api/auth/login', async ({ body, set }: any) => {
    try {
      const user = await heimdall.auth.login(body)
      const accessToken = await heimdall.auth.getAccessToken()

      return {
        success: true,
        data: { user, accessToken }
      }
    } catch (error: any) {
      set.status = error.statusCode || 500
      return {
        success: false,
        error: error.message || 'Login failed'
      }
    }
  })

  .get('/api/users/me', async ({ bearer, set }: any) => {
    if (!bearer) {
      set.status = 401
      return { success: false, error: 'No token provided' }
    }

    try {
      await heimdall.auth.setAccessToken(bearer)
      const user = await heimdall.user.getProfile()
      return { success: true, data: user }
    } catch (error: any) {
      set.status = 401
      return { success: false, error: 'Invalid token' }
    }
  })

console.log('[TEST] About to listen on port 3005')

app.listen(3005)

console.log(`[TEST] Server running at http://localhost:3005`)
