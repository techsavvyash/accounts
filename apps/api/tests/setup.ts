import { beforeAll, afterAll, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { prisma } from '@accounts/database'

// Use the database connection
const db = prisma

// Test app instance
let testApp: Elysia

// Test database cleanup
export async function cleanupDatabase() {
  // Clean up in reverse dependency order
  try {
    await db.webhookDelivery.deleteMany()
    await db.webhook.deleteMany()
    await db.stockMovement.deleteMany() 
    await db.stockLevel.deleteMany()
    await db.invoiceLineItem.deleteMany()
    await db.invoice.deleteMany()
    await db.party.deleteMany()
    await db.inventoryItem.deleteMany()
    await db.taxRate.deleteMany()
    await db.refreshToken.deleteMany()
    await db.userTenant.deleteMany()
    await db.user.deleteMany()
    await db.tenant.deleteMany()
  } catch (error) {
    console.warn('Warning: Some tables may not exist during cleanup:', error.message)
  }
}

// Setup test environment
export async function setupTestEnvironment() {
  // Import the main app
  const { default: createApp } = await import('../src/index')
  testApp = createApp
  
  // Clean database before tests
  await cleanupDatabase()
  
  return testApp
}

// Cleanup after tests
export async function teardownTestEnvironment() {
  await cleanupDatabase()
  await db.$disconnect()
}

// Test data factories
export const testData = {
  tenant: {
    name: 'Test Company Ltd',
    businessName: 'Test Business',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    address: '123 Test Street, Test City, Test State, 123456',
    phone: '+91-9876543210',
    email: 'test@testcompany.com'
  },
  
  user: {
    email: 'admin@testcompany.com',
    password: 'TestPassword123!',
    fullName: 'Test Admin User'
  },
  
  customer: {
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '+91-9876543211',
    gstin: '29FGHIJ5678K1L2',
    address: '456 Customer Street, Customer City, Customer State, 654321'
  },
  
  inventoryItem: {
    name: 'Test Product',
    description: 'Test product description',
    sku: 'TEST-PROD-001',
    hsnCode: '1234',
    purchasePrice: 100.00,
    salePrice: 150.00,
    reorderPoint: 10
  },
  
  taxRate: {
    name: 'Standard GST',
    cgst: 9.0,
    sgst: 9.0,
    igst: 18.0,
    isDefault: true
  }
}

// Helper functions for tests
export class TestHelpers {
  static async createAuthenticatedUser() {
    const response = await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testData.user,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    const result = await response.json()
    return {
      user: result.data.user,
      tenant: result.data.tenant,
      token: result.data.accessToken
    }
  }
  
  static getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  
  static async makeAuthenticatedRequest(
    method: string,
    path: string,
    token: string,
    body?: any
  ) {
    return await testApp.handle(
      new Request(`http://localhost:3000${path}`, {
        method,
        headers: this.getAuthHeaders(token),
        body: body ? JSON.stringify(body) : undefined
      })
    )
  }
}

// Global test setup
beforeAll(async () => {
  testApp = await setupTestEnvironment()
})

beforeEach(async () => {
  await cleanupDatabase()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

export { testApp }