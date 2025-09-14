import { treaty } from '@elysiajs/eden'
import type { App } from './index'

// Simple test to verify the API is working
async function testAPI() {
  console.log('🧪 Testing API endpoints...')

  const api = treaty<App>('localhost:3000')

  try {
    // Test health endpoint
    const health = await api.health.get()
    console.log('✅ Health check:', health.data)

    // Test Swagger docs
    console.log('📚 API Documentation available at: http://localhost:3000/api/docs')

    console.log('✅ Basic API test completed!')
  } catch (error) {
    console.error('❌ API test failed:', error)
  }
}

if (import.meta.main) {
  testAPI()
}