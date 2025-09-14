import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('Invoice Management End-to-End Tests', () => {
  let authData: any
  let customerId: string
  let inventoryItemId: string
  let taxRateId: string
  
  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
    
    // Create a customer
    const customerResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/parties',
      authData.token,
      { ...testData.customer, type: 'CUSTOMER' }
    )
    const customerResult = await customerResponse.json()
    customerId = customerResult.data.id
    
    // Create an inventory item
    const inventoryResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    const inventoryResult = await inventoryResponse.json()
    inventoryItemId = inventoryResult.data.id
    
    // Create a tax rate
    const taxResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/tax-rates',
      authData.token,
      testData.taxRate
    )
    const taxResult = await taxResponse.json()
    taxRateId = taxResult.data.id
  })
  
  it('should create a complete invoice with line items', async () => {
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lineItems: [
        {
          inventoryItemId,
          description: 'Test Product Sale',
          quantity: 5,
          unitPrice: 150.00,
          taxRateId
        },
        {
          description: 'Service Item',
          quantity: 2,
          unitPrice: 200.00,
          taxRateId
        }
      ],
      notes: 'Test invoice with mixed items'
    }
    
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    expect(response.status).toBe(201)
    
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.customerId).toBe(customerId)
    expect(result.data.status).toBe('DRAFT')
    expect(result.data.invoiceNumber).toMatch(/^INV-\d{6}$/)
    expect(result.data.lineItems).toHaveLength(2)
    
    // Verify calculations
    const subtotal = (5 * 150) + (2 * 200) // 750 + 400 = 1150
    const taxAmount = (subtotal * 18) / 100 // 207
    const total = subtotal + taxAmount // 1357
    
    expect(Number(result.data.subtotal)).toBe(subtotal)
    expect(Number(result.data.taxAmount)).toBe(taxAmount)
    expect(Number(result.data.totalAmount)).toBe(total)
  })
  
  it('should retrieve invoice list and details', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          inventoryItemId,
          description: 'Test Product',
          quantity: 2,
          unitPrice: 150.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    
    // Get invoice list
    const listResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/invoices',
      authData.token
    )
    
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    expect(listResult.success).toBe(true)
    expect(listResult.data.length).toBe(1)
    expect(listResult.data[0].id).toBe(invoiceId)
    
    // Get specific invoice
    const detailResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/invoices/${invoiceId}`,
      authData.token
    )
    
    expect(detailResponse.status).toBe(200)
    
    const detailResult = await detailResponse.json()
    expect(detailResult.success).toBe(true)
    expect(detailResult.data.id).toBe(invoiceId)
    expect(detailResult.data.customer).toBeDefined()
    expect(detailResult.data.lineItems).toBeDefined()
  })
  
  it('should update invoice status', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          description: 'Test Service',
          quantity: 1,
          unitPrice: 1000.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    
    // Update status to SENT
    const updateResponse = await TestHelpers.makeAuthenticatedRequest(
      'PUT',
      `/api/invoices/${invoiceId}/status`,
      authData.token,
      { status: 'SENT' }
    )
    
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.success).toBe(true)
    expect(updateResult.data.status).toBe('SENT')
  })
  
  it('should record payment for invoice', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          description: 'Payment Test Service',
          quantity: 1,
          unitPrice: 500.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    const totalAmount = Number(createResult.data.totalAmount)
    
    // Record payment
    const paymentData = {
      amount: totalAmount,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date().toISOString(),
      reference: 'TEST-PAYMENT-001',
      notes: 'Full payment test'
    }
    
    const paymentResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      `/api/invoices/${invoiceId}/payments`,
      authData.token,
      paymentData
    )
    
    expect(paymentResponse.status).toBe(200)
    
    const paymentResult = await paymentResponse.json()
    expect(paymentResult.success).toBe(true)
    expect(paymentResult.data.status).toBe('PAID')
    expect(Number(paymentResult.data.paidAmount)).toBe(totalAmount)
  })
  
  it('should handle partial payments', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          description: 'Partial Payment Test',
          quantity: 1,
          unitPrice: 1000.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    const totalAmount = Number(createResult.data.totalAmount)
    
    // Record partial payment (50%)
    const partialAmount = totalAmount * 0.5
    const paymentData = {
      amount: partialAmount,
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString(),
      reference: 'PARTIAL-001',
      notes: 'Partial payment'
    }
    
    const paymentResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      `/api/invoices/${invoiceId}/payments`,
      authData.token,
      paymentData
    )
    
    expect(paymentResponse.status).toBe(200)
    
    const paymentResult = await paymentResponse.json()
    expect(paymentResult.success).toBe(true)
    expect(paymentResult.data.status).toBe('PARTIALLY_PAID')
    expect(Number(paymentResult.data.paidAmount)).toBe(partialAmount)
    expect(Number(paymentResult.data.balanceAmount)).toBe(totalAmount - partialAmount)
  })
  
  it('should void an invoice', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          description: 'Void Test Service',
          quantity: 1,
          unitPrice: 300.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    
    // Void invoice
    const voidResponse = await TestHelpers.makeAuthenticatedRequest(
      'PUT',
      `/api/invoices/${invoiceId}/void`,
      authData.token,
      { reason: 'Testing void functionality' }
    )
    
    expect(voidResponse.status).toBe(200)
    
    const voidResult = await voidResponse.json()
    expect(voidResult.success).toBe(true)
    expect(voidResult.data.status).toBe('VOID')
  })
  
  it('should validate invoice business rules', async () => {
    // Try to create invoice without line items
    const invalidInvoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: []
    }
    
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invalidInvoiceData
    )
    
    expect(response.status).toBe(400)
    
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('line items')
  })
  
  it('should update invoice line items', async () => {
    // Create invoice
    const invoiceData = {
      customerId,
      invoiceDate: new Date().toISOString(),
      lineItems: [
        {
          description: 'Original Item',
          quantity: 1,
          unitPrice: 100.00,
          taxRateId
        }
      ]
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      invoiceData
    )
    
    const createResult = await createResponse.json()
    const invoiceId = createResult.data.id
    
    // Update invoice with new line items
    const updateData = {
      lineItems: [
        {
          description: 'Updated Item',
          quantity: 2,
          unitPrice: 200.00,
          taxRateId
        },
        {
          description: 'New Item',
          quantity: 1,
          unitPrice: 50.00,
          taxRateId
        }
      ]
    }
    
    const updateResponse = await TestHelpers.makeAuthenticatedRequest(
      'PUT',
      `/api/invoices/${invoiceId}`,
      authData.token,
      updateData
    )
    
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.success).toBe(true)
    expect(updateResult.data.lineItems).toHaveLength(2)
    
    // Verify new calculations
    const subtotal = (2 * 200) + (1 * 50) // 400 + 50 = 450
    const taxAmount = (subtotal * 18) / 100 // 81
    const total = subtotal + taxAmount // 531
    
    expect(Number(updateResult.data.subtotal)).toBe(subtotal)
    expect(Number(updateResult.data.totalAmount)).toBe(total)
  })
})