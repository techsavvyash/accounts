import { HeimdallClient } from '@techsavvyash/heimdall-sdk'

const client = new HeimdallClient({
  apiUrl: 'http://localhost:8080',
  tenantId: undefined,
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

async function testRegister() {
  try {
    console.log('Testing registration with Heimdall SDK...')

    const user = await client.auth.register({
      email: `sdk-test-${Date.now()}@example.com`,
      password: 'Test123456!',
      firstName: 'SDK',
      lastName: 'Test',
    })

    console.log('✅ Registration successful!')
    console.log('User:', JSON.stringify(user, null, 2))

    console.log('\nChecking available methods...')
    console.log('Auth methods:', Object.keys(client.auth))

    console.log('\nGetting tokens...')
    const accessToken = await client.auth.getAccessToken()

    console.log('Access Token:', accessToken ? accessToken.substring(0, 50) + '...' : 'NULL')

  } catch (error: any) {
    console.error('❌ Registration failed!')
    console.error('Error:', error.message)
    console.error('Code:', error.code)
    console.error('Full error:', error)
  }
}

testRegister()
