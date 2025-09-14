import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('Analytics Integration End-to-End Tests', () => {
  let authData: any
  
  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })
  
  it('should track basic business metrics', async () => {
    // Create some test data first
    const customerId = await createTestCustomer()
    const inventoryItemId = await createTestInventoryItem()
    const taxRateId = await createTestTaxRate()
    
    // Create an invoice (this should trigger analytics events)
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          inventoryItemId,
          description: 'Analytics Test Product',
          quantity: 3,
          unitPrice: 500.00,
          taxRateId
        }
      ],
      notes: 'Test invoice for analytics'
    }
    
    const invoiceResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    expect(invoiceResponse.status).toBe(201)
    
    // Get analytics dashboard data
    const analyticsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/dashboard',
      authData.token
    )
    
    expect(analyticsResponse.status).toBe(200)
    
    const analyticsResult = await analyticsResponse.json()
    expect(analyticsResult.success).toBe(true)
    expect(analyticsResult.data.metrics).toBeDefined()
    expect(analyticsResult.data.metrics.totalInvoices).toBe(1)
    expect(Number(analyticsResult.data.metrics.totalRevenue)).toBeGreaterThan(0)
  })
  
  it('should track revenue metrics over time', async () => {
    const customerId = await createTestCustomer()
    const taxRateId = await createTestTaxRate()
    
    // Create multiple invoices across different dates
    const invoiceData = [
      {
        customerId,
        invoiceDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        lineItems: [
          {
            description: 'Week 1 Service',
            quantity: 1,
            unitPrice: 1000.00,
            taxRateId
          }
        ]
      },
      {
        customerId,
        invoiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        lineItems: [
          {
            description: 'Week 2 Service',
            quantity: 1,
            unitPrice: 1500.00,
            taxRateId
          }
        ]
      },
      {
        customerId,
        invoiceDate: new Date().toISOString(), // Today
        lineItems: [
          {
            description: 'Today Service',
            quantity: 1,
            unitPrice: 2000.00,
            taxRateId
          }
        ]
      }
    ]
    
    // Create all invoices
    for (const invoice of invoiceData) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/invoices',
        authData.token,
        invoice
      )
    }
    
    // Get revenue trends
    const trendResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/revenue-trends?period=30d',
      authData.token
    )
    
    expect(trendResponse.status).toBe(200)
    
    const trendResult = await trendResponse.json()
    expect(trendResult.success).toBe(true)
    expect(trendResult.data.totalRevenue).toBeGreaterThan(0)
    expect(trendResult.data.dailyTrends).toBeDefined()
    expect(trendResult.data.dailyTrends.length).toBeGreaterThan(0)
  })
  
  it('should track customer metrics', async () => {
    // Create multiple customers
    const customers = [
      {
        name: 'Customer A',
        type: 'CUSTOMER',
        email: 'customerA@test.com',
        gstin: '29AAAAA1111A1A1'
      },
      {
        name: 'Customer B',
        type: 'CUSTOMER', 
        email: 'customerB@test.com',
        gstin: '29BBBBB2222B2B2'
      },
      {
        name: 'Customer C',
        type: 'CUSTOMER',
        email: 'customerC@test.com'
      }
    ]
    
    const customerIds = []
    for (const customer of customers) {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        customer
      )
      const result = await response.json()
      customerIds.push(result.data.id)
    }
    
    // Create invoices for some customers
    const taxRateId = await createTestTaxRate()
    
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      {
        customerId: customerIds[0],
        invoiceDate: new Date().toISOString(),
        lineItems: [
          {
            description: 'Service for Customer A',
            quantity: 1,
            unitPrice: 5000.00,
            taxRateId
          }
        ]
      }
    )
    
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      {
        customerId: customerIds[1],
        invoiceDate: new Date().toISOString(),
        lineItems: [
          {
            description: 'Service for Customer B',
            quantity: 2,
            unitPrice: 2500.00,
            taxRateId
          }
        ]
      }
    )
    
    // Get customer analytics
    const customerAnalyticsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/customers',
      authData.token
    )
    
    expect(customerAnalyticsResponse.status).toBe(200)
    
    const customerResult = await customerAnalyticsResponse.json()
    expect(customerResult.success).toBe(true)
    expect(customerResult.data.totalCustomers).toBe(3)
    expect(customerResult.data.activeCustomers).toBe(2) // Customers with invoices
    expect(customerResult.data.topCustomers).toBeDefined()
    expect(customerResult.data.topCustomers.length).toBeGreaterThan(0)
  })
  
  it('should track inventory metrics', async () => {
    // Create inventory items
    const items = [
      {
        name: 'Product A',
        sku: 'PROD-A-001',
        salePrice: 100.00,
        reorderPoint: 10
      },
      {
        name: 'Product B',
        sku: 'PROD-B-002', 
        salePrice: 200.00,
        reorderPoint: 5
      }
    ]
    
    const itemIds = []
    for (const item of items) {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/inventory',
        authData.token,
        item
      )
      const result = await response.json()
      itemIds.push(result.data.id)
    }
    
    // Add stock to items
    for (const itemId of itemIds) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/inventory/stock-movement',
        authData.token,
        {
          inventoryItemId: itemId,
          quantity: 50,
          type: 'INWARD',
          reason: 'Initial stock',
          unitCost: 50.00
        }
      )
    }
    
    // Move some stock to create low stock situation
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory/stock-movement',
      authData.token,
      {
        inventoryItemId: itemIds[0],
        quantity: 45, // Leaves only 5, below reorder point of 10
        type: 'OUTWARD',
        reason: 'Sale',
        unitCost: 50.00
      }
    )
    
    // Get inventory analytics
    const inventoryAnalyticsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/inventory',
      authData.token
    )
    
    expect(inventoryAnalyticsResponse.status).toBe(200)
    
    const inventoryResult = await inventoryAnalyticsResponse.json()
    expect(inventoryResult.success).toBe(true)
    expect(inventoryResult.data.totalItems).toBe(2)
    expect(inventoryResult.data.lowStockItems).toBe(1)
    expect(Number(inventoryResult.data.totalInventoryValue)).toBeGreaterThan(0)
  })
  
  it('should track GST analytics', async () => {
    const customerId = await createTestCustomer()
    const taxRateId = await createTestTaxRate()
    
    // Create invoices with different GST amounts
    const invoices = [
      {
        customerId,
        invoiceDate: new Date().toISOString(),
        lineItems: [
          {
            description: 'High value service',
            quantity: 1,
            unitPrice: 10000.00,
            taxRateId
          }
        ]
      },
      {
        customerId,
        invoiceDate: new Date().toISOString(),
        lineItems: [
          {
            description: 'Medium value service',
            quantity: 2,
            unitPrice: 2500.00,
            taxRateId
          }
        ]
      }
    ]
    
    for (const invoice of invoices) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/invoices',
        authData.token,
        invoice
      )
    }
    
    // Get GST analytics
    const gstAnalyticsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/gst',
      authData.token
    )
    
    expect(gstAnalyticsResponse.status).toBe(200)
    
    const gstResult = await gstAnalyticsResponse.json()
    expect(gstResult.success).toBe(true)
    expect(Number(gstResult.data.totalGSTCollected)).toBeGreaterThan(0)
    expect(gstResult.data.gstBreakdown).toBeDefined()
    expect(gstResult.data.monthlyGST).toBeDefined()
  })
  
  it('should provide comprehensive dashboard overview', async () => {
    // Create comprehensive test data
    const customerId = await createTestCustomer()
    const inventoryItemId = await createTestInventoryItem() 
    const taxRateId = await createTestTaxRate()
    
    // Create invoice
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      {
        customerId,
        invoiceDate: new Date().toISOString(),
        lineItems: [
          {
            inventoryItemId,
            description: 'Dashboard test product',
            quantity: 1,
            unitPrice: 1000.00,
            taxRateId
          }
        ]
      }
    )
    
    // Add stock movement
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory/stock-movement',
      authData.token,
      {
        inventoryItemId,
        quantity: 100,
        type: 'INWARD',
        reason: 'Dashboard test stock',
        unitCost: 500.00
      }
    )
    
    // Get full dashboard
    const dashboardResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/analytics/dashboard',
      authData.token
    )
    
    expect(dashboardResponse.status).toBe(200)
    
    const dashboardResult = await dashboardResponse.json()
    expect(dashboardResult.success).toBe(true)
    
    const metrics = dashboardResult.data.metrics
    expect(metrics.totalCustomers).toBe(1)
    expect(metrics.totalInvoices).toBe(1)
    expect(metrics.totalInventoryItems).toBe(1)
    expect(Number(metrics.totalRevenue)).toBeGreaterThan(0)
    expect(Number(metrics.totalGSTCollected)).toBeGreaterThan(0)
    
    // Check charts data
    expect(dashboardResult.data.charts).toBeDefined()
    expect(dashboardResult.data.charts.revenueChart).toBeDefined()
    expect(dashboardResult.data.charts.customerChart).toBeDefined()
    expect(dashboardResult.data.charts.inventoryChart).toBeDefined()
  })
  
  // Helper functions
  async function createTestCustomer() {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/parties',
      authData.token,
      {
        name: 'Analytics Test Customer',
        type: 'CUSTOMER',
        email: 'analytics@test.com',
        gstin: '29ANLYT1234T1Z5'
      }
    )
    const result = await response.json()
    return result.data.id
  }
  
  async function createTestInventoryItem() {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      {
        name: 'Analytics Test Item',
        sku: 'ANLY-001',
        salePrice: 1000.00,
        reorderPoint: 10
      }
    )
    const result = await response.json()
    return result.data.id
  }
  
  async function createTestTaxRate() {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/tax-rates',
      authData.token,
      {
        name: 'Analytics Test Tax',
        cgst: 9.0,
        sgst: 9.0,
        igst: 18.0,
        isDefault: false
      }
    )
    const result = await response.json()
    return result.data.id
  }
})