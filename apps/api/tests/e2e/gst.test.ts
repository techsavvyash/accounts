import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('GST Compliance End-to-End Tests', () => {
  let authData: any
  
  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })
  
  it('should create and manage tax rates', async () => {
    // Create tax rate
    const taxRateData = {
      name: 'Standard GST Rate',
      cgst: 9.0,
      sgst: 9.0,
      igst: 18.0,
      isDefault: true
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/tax-rates',
      authData.token,
      taxRateData
    )
    
    expect(createResponse.status).toBe(201)
    
    const createResult = await createResponse.json()
    expect(createResult.success).toBe(true)
    expect(createResult.data.name).toBe(taxRateData.name)
    expect(Number(createResult.data.igst)).toBe(taxRateData.igst)
    
    // Get tax rates list
    const listResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/gst/tax-rates',
      authData.token
    )
    
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    expect(listResult.success).toBe(true)
    expect(listResult.data.length).toBe(1)
    expect(listResult.data[0].name).toBe(taxRateData.name)
  })
  
  it('should calculate GST for different scenarios', async () => {
    // Test intra-state calculation (CGST + SGST)
    const intraStateCalc = {
      amount: 1000,
      cgst: 9,
      sgst: 9,
      igst: 0,
      isInterState: false
    }
    
    const intraResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/calculate',
      authData.token,
      intraStateCalc
    )
    
    expect(intraResponse.status).toBe(200)
    
    const intraResult = await intraResponse.json()
    expect(intraResult.success).toBe(true)
    expect(Number(intraResult.data.cgstAmount)).toBe(90)
    expect(Number(intraResult.data.sgstAmount)).toBe(90)
    expect(Number(intraResult.data.igstAmount)).toBe(0)
    expect(Number(intraResult.data.totalTax)).toBe(180)
    expect(Number(intraResult.data.totalAmount)).toBe(1180)
    
    // Test inter-state calculation (IGST only)
    const interStateCalc = {
      amount: 1000,
      cgst: 0,
      sgst: 0,
      igst: 18,
      isInterState: true
    }
    
    const interResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/calculate',
      authData.token,
      interStateCalc
    )
    
    expect(interResponse.status).toBe(200)
    
    const interResult = await interResponse.json()
    expect(interResult.success).toBe(true)
    expect(Number(interResult.data.cgstAmount)).toBe(0)
    expect(Number(interResult.data.sgstAmount)).toBe(0)
    expect(Number(interResult.data.igstAmount)).toBe(180)
    expect(Number(interResult.data.totalTax)).toBe(180)
  })
  
  it('should validate GSTIN format', async () => {
    const validGSTINs = [
      '29ABCDE1234F1Z5',
      '07AAACG2115R1ZN',
      '27AAFCS3047N1ZI'
    ]
    
    const invalidGSTINs = [
      '29ABCDE1234F1Z', // Too short
      '29ABCDE1234F1Z56', // Too long
      '99ABCDE1234F1Z5', // Invalid state code
      'ABCDEFGHIJKLMNO' // Invalid format
    ]
    
    // Test valid GSTINs
    for (const gstin of validGSTINs) {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/gst/validate-gstin',
        authData.token,
        { gstin }
      )
      
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(true)
      expect(result.data.gstin).toBe(gstin)
    }
    
    // Test invalid GSTINs
    for (const gstin of invalidGSTINs) {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/gst/validate-gstin',
        authData.token,
        { gstin }
      )
      
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.isValid).toBe(false)
      expect(result.data.errors).toBeDefined()
      expect(result.data.errors.length).toBeGreaterThan(0)
    }
  })
  
  it('should generate GSTR-1 return data', async () => {
    // First create some invoices with GST
    const customerId = await createTestCustomer()
    const taxRateId = await createTestTaxRate()
    
    // Create multiple invoices
    const invoices = [
      {
        customerId,
        invoiceDate: '2024-01-15T00:00:00.000Z',
        lineItems: [
          {
            description: 'Product A',
            quantity: 2,
            unitPrice: 1000,
            taxRateId
          }
        ]
      },
      {
        customerId,
        invoiceDate: '2024-01-20T00:00:00.000Z',
        lineItems: [
          {
            description: 'Product B',
            quantity: 1,
            unitPrice: 2000,
            taxRateId
          }
        ]
      }
    ]
    
    for (const invoiceData of invoices) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/invoices',
        authData.token,
        invoiceData
      )
    }
    
    // Generate GSTR-1
    const gstr1Response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/gstr1',
      authData.token,
      {
        month: 1,
        year: 2024
      }
    )
    
    expect(gstr1Response.status).toBe(200)
    
    const gstr1Result = await gstr1Response.json()
    expect(gstr1Result.success).toBe(true)
    expect(gstr1Result.data.summary).toBeDefined()
    expect(gstr1Result.data.b2b).toBeDefined()
    expect(Number(gstr1Result.data.summary.totalTaxableValue)).toBeGreaterThan(0)
    expect(Number(gstr1Result.data.summary.totalTaxAmount)).toBeGreaterThan(0)
  })
  
  it('should generate GSTR-3B return data', async () => {
    // Create test data similar to GSTR-1 test
    const customerId = await createTestCustomer()
    const taxRateId = await createTestTaxRate()
    
    // Create invoice
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/invoices',
      authData.token,
      {
        customerId,
        invoiceDate: '2024-02-10T00:00:00.000Z',
        lineItems: [
          {
            description: 'Service A',
            quantity: 1,
            unitPrice: 5000,
            taxRateId
          }
        ]
      }
    )
    
    // Generate GSTR-3B
    const gstr3bResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/gstr3b',
      authData.token,
      {
        month: 2,
        year: 2024
      }
    )
    
    expect(gstr3bResponse.status).toBe(200)
    
    const gstr3bResult = await gstr3bResponse.json()
    expect(gstr3bResult.success).toBe(true)
    expect(gstr3bResult.data.outwardSupplies).toBeDefined()
    expect(gstr3bResult.data.taxLiability).toBeDefined()
    expect(Number(gstr3bResult.data.outwardSupplies.totalTaxableValue)).toBeGreaterThan(0)
  })
  
  it('should handle HSN code classification', async () => {
    // Test HSN code lookup
    const hsnResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/gst/hsn/1234',
      authData.token
    )
    
    expect(hsnResponse.status).toBe(200)
    
    const hsnResult = await hsnResponse.json()
    expect(hsnResult.success).toBe(true)
    expect(hsnResult.data.code).toBe('1234')
    expect(hsnResult.data.description).toBeDefined()
  })
  
  // Helper functions
  async function createTestCustomer() {
    const customerResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/parties',
      authData.token,
      {
        name: 'GST Test Customer',
        type: 'CUSTOMER',
        gstin: '29FGHIJ5678K1L2',
        email: 'gst.customer@test.com',
        address: 'Test Address'
      }
    )
    const customerResult = await customerResponse.json()
    return customerResult.data.id
  }
  
  async function createTestTaxRate() {
    const taxResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/gst/tax-rates',
      authData.token,
      {
        name: 'Test GST Rate',
        cgst: 9.0,
        sgst: 9.0,
        igst: 18.0,
        isDefault: false
      }
    )
    const taxResult = await taxResponse.json()
    return taxResult.data.id
  }
})