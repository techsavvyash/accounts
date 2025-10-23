import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('Parties Management End-to-End Tests', () => {
  let authData: any

  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const customerData = {
        type: 'CUSTOMER',
        name: 'ABC Corporation',
        email: 'contact@abccorp.com',
        phone: '+91-9876543210',
        gstin: '29ABCDE1234F1Z5',
        address: '123 Business Street, Bangalore, Karnataka, 560001'
      }

      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        customerData
      )

      expect(response.status).toBe(201)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.name).toBe(customerData.name)
      expect(result.data.email).toBe(customerData.email)
      expect(result.data.gstin).toBe(customerData.gstin)
      expect(result.data.type).toBe('CUSTOMER')
    })

    it('should validate GSTIN format for customers', async () => {
      const customerData = {
        type: 'CUSTOMER',
        name: 'Invalid GSTIN Corp',
        email: 'test@test.com',
        gstin: 'INVALID-GSTIN' // Invalid format
      }

      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        customerData
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('GSTIN')
    })

    it('should retrieve customer list', async () => {
      // Create multiple customers
      const customers = [
        {
          type: 'CUSTOMER',
          name: 'Customer A',
          email: 'a@test.com',
          gstin: '29ABCDE1234F1Z5'
        },
        {
          type: 'CUSTOMER',
          name: 'Customer B',
          email: 'b@test.com',
          gstin: '27FGHIJ5678K1L2'
        },
        {
          type: 'CUSTOMER',
          name: 'Customer C',
          email: 'c@test.com'
        }
      ]

      for (const customer of customers) {
        await TestHelpers.makeAuthenticatedRequest(
          'POST',
          '/api/parties',
          authData.token,
          customer
        )
      }

      // Get customer list
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?type=CUSTOMER',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.length).toBe(3)
    })

    it('should retrieve single customer details', async () => {
      // Create customer
      const createResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Test Customer',
          email: 'customer@test.com',
          gstin: '29ABCDE1234F1Z5'
        }
      )
      const createResult = await createResponse.json()
      const customerId = createResult.data.id

      // Get customer details
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        `/api/parties/${customerId}`,
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.id).toBe(customerId)
      expect(result.data.name).toBe('Test Customer')
    })

    it('should update customer information', async () => {
      // Create customer
      const createResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Original Name',
          email: 'original@test.com',
          phone: '+91-1111111111'
        }
      )
      const createResult = await createResponse.json()
      const customerId = createResult.data.id

      // Update customer
      const updateData = {
        name: 'Updated Name',
        phone: '+91-2222222222',
        address: 'New Address, New City'
      }

      const response = await TestHelpers.makeAuthenticatedRequest(
        'PUT',
        `/api/parties/${customerId}`,
        authData.token,
        updateData
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.name).toBe('Updated Name')
      expect(result.data.phone).toBe('+91-2222222222')
      expect(result.data.address).toContain('New Address')
    })

    it('should delete/deactivate a customer', async () => {
      // Create customer
      const createResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'To Be Deleted',
          email: 'delete@test.com'
        }
      )
      const createResult = await createResponse.json()
      const customerId = createResult.data.id

      // Delete customer
      const response = await TestHelpers.makeAuthenticatedRequest(
        'DELETE',
        `/api/parties/${customerId}`,
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)

      // Try to get deleted customer
      const getResponse = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        `/api/parties/${customerId}`,
        authData.token
      )

      expect(getResponse.status).toBe(404)
    })
  })

  describe('Supplier Management', () => {
    it('should create a new supplier', async () => {
      const supplierData = {
        type: 'SUPPLIER',
        name: 'XYZ Suppliers Ltd',
        email: 'sales@xyzsuppliers.com',
        phone: '+91-9876543210',
        gstin: '29XYZAB1234C1D2',
        address: '456 Supplier Road, Mumbai, Maharashtra, 400001'
      }

      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        supplierData
      )

      expect(response.status).toBe(201)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.name).toBe(supplierData.name)
      expect(result.data.type).toBe('SUPPLIER')
    })

    it('should retrieve supplier list', async () => {
      // Create suppliers
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'SUPPLIER',
          name: 'Supplier A',
          email: 'sa@test.com'
        }
      )

      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'SUPPLIER',
          name: 'Supplier B',
          email: 'sb@test.com'
        }
      )

      // Get supplier list
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?type=SUPPLIER',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.length).toBe(2)
      expect(result.data.every((p: any) => p.type === 'SUPPLIER')).toBe(true)
    })
  })

  describe('Party Search & Filtering', () => {
    beforeEach(async () => {
      // Create test data
      const parties = [
        { type: 'CUSTOMER', name: 'Acme Corporation', email: 'acme@test.com', gstin: '29ACME12345A1B2' },
        { type: 'CUSTOMER', name: 'Best Electronics', email: 'best@test.com' },
        { type: 'SUPPLIER', name: 'Global Suppliers', email: 'global@test.com', gstin: '27GLOB12345C1D2' },
        { type: 'SUPPLIER', name: 'Quick Parts Inc', email: 'quick@test.com' },
        { type: 'CUSTOMER', name: 'Zenith Traders', email: 'zenith@test.com' }
      ]

      for (const party of parties) {
        await TestHelpers.makeAuthenticatedRequest(
          'POST',
          '/api/parties',
          authData.token,
          party
        )
      }
    })

    it('should search parties by name', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?search=Global',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.length).toBe(1)
      expect(result.data[0].name).toContain('Global')
    })

    it('should filter parties by type', async () => {
      const customersResponse = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?type=CUSTOMER',
        authData.token
      )

      const customersResult = await customersResponse.json()
      expect(customersResult.data.length).toBe(3)

      const suppliersResponse = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?type=SUPPLIER',
        authData.token
      )

      const suppliersResult = await suppliersResponse.json()
      expect(suppliersResult.data.length).toBe(2)
    })

    it('should filter parties with GSTIN', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?hasGstin=true',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.every((p: any) => p.gstin !== null)).toBe(true)
    })

    it('should paginate party results', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?page=1&limit=2',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.length).toBeLessThanOrEqual(2)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(2)
    })

    it('should sort parties alphabetically', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?sortBy=name&sortOrder=asc',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)

      const names = result.data.map((p: any) => p.name)
      const sortedNames = [...names].sort()
      expect(names).toEqual(sortedNames)
    })
  })

  describe('Party Validation', () => {
    it('should require party type', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          name: 'Test Party',
          email: 'test@test.com'
          // Missing type
        }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('type')
    })

    it('should require party name', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          email: 'test@test.com'
          // Missing name
        }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('name')
    })

    it('should validate email format', async () => {
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Test Customer',
          email: 'invalid-email' // Invalid format
        }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('email')
    })

    it('should prevent duplicate email addresses', async () => {
      const partyData = {
        type: 'CUSTOMER',
        name: 'First Customer',
        email: 'duplicate@test.com'
      }

      // Create first party
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        partyData
      )

      // Try to create second party with same email
      const response = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          ...partyData,
          name: 'Second Customer'
        }
      )

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('email')
    })
  })

  describe('Party Transactions', () => {
    it('should retrieve party transaction history', async () => {
      // Create customer
      const customerResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Transaction Test Customer',
          email: 'trans@test.com'
        }
      )
      const customerResult = await customerResponse.json()
      const customerId = customerResult.data.id

      // Create an invoice for this customer
      // (This would require inventory and tax rate setup - simplified for this test)

      // Get party transactions
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        `/api/parties/${customerId}/transactions`,
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })

    it('should calculate party outstanding balance', async () => {
      // Create customer
      const customerResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Balance Test Customer',
          email: 'balance@test.com'
        }
      )
      const customerResult = await customerResponse.json()
      const customerId = customerResult.data.id

      // Get party balance
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        `/api/parties/${customerId}/balance`,
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.outstanding).toBeDefined()
      expect(Number(result.data.outstanding)).toBe(0) // No transactions yet
    })
  })

  describe('Party Categories & Tags', () => {
    it('should assign category to party', async () => {
      // Create customer
      const customerResponse = await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Categorized Customer',
          email: 'cat@test.com',
          category: 'RETAIL'
        }
      )

      expect(customerResponse.status).toBe(201)

      const result = await customerResponse.json()
      expect(result.data.category).toBe('RETAIL')
    })

    it('should filter parties by category', async () => {
      // Create customers with different categories
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Retail Customer 1',
          email: 'retail1@test.com',
          category: 'RETAIL'
        }
      )

      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/parties',
        authData.token,
        {
          type: 'CUSTOMER',
          name: 'Wholesale Customer',
          email: 'wholesale@test.com',
          category: 'WHOLESALE'
        }
      )

      // Filter by category
      const response = await TestHelpers.makeAuthenticatedRequest(
        'GET',
        '/api/parties?category=RETAIL',
        authData.token
      )

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.data.every((p: any) => p.category === 'RETAIL')).toBe(true)
    })
  })
})
