import { test, expect } from '@playwright/test'

const API_URL = 'http://localhost:6969'
const WEB_URL = 'http://localhost:3000'

// Helper function to login and get auth token
async function login(page) {
  // Navigate to login page
  await page.goto(WEB_URL)

  // Fill in login credentials (adjust based on your auth implementation)
  await page.fill('input[type="email"]', 'testlogin@example.com')
  await page.fill('input[type="password"]', 'testpassword')
  await page.click('button[type="submit"]')

  // Wait for successful login
  await page.waitForURL('**/dashboard', { timeout: 10000 })

  // Get auth token from localStorage
  const authToken = await page.evaluate(() => localStorage.getItem('authToken'))
  return authToken
}

test.describe('Credit/Debit Notes End-to-End Tests', () => {
  let authToken: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    authToken = await login(page)
    await context.close()
  })

  test('should create a credit note via API', async ({ request }) => {
    // First, create a customer to reference
    const customerResponse = await request.post(`${API_URL}/api/parties/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Test Customer for Credit Note',
        email: 'testcustomer@example.com',
        gstin: '27AABCT1234M1Z5',
        phone: '+919876543210',
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        }
      }
    })

    expect(customerResponse.ok()).toBeTruthy()
    const customerData = await customerResponse.json()
    const customerId = customerData.data.id

    // Create a credit note
    const creditNoteResponse = await request.post(`${API_URL}/api/credit-debit-notes/credit`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        customerId: customerId,
        issueDate: new Date().toISOString().split('T')[0],
        reason: 'Product return - defective item',
        notes: 'Customer returned a defective product',
        lineItems: [
          {
            description: 'Wireless Headphones - Return',
            hsnCode: '85183000',
            quantity: 1,
            unitPrice: 2500
          }
        ]
      }
    })

    expect(creditNoteResponse.ok()).toBeTruthy()
    const creditNoteData = await creditNoteResponse.json()

    expect(creditNoteData.success).toBe(true)
    expect(creditNoteData.data).toHaveProperty('id')
    expect(creditNoteData.data).toHaveProperty('creditNoteNumber')
    expect(creditNoteData.data.status).toBe('DRAFT')
    expect(creditNoteData.data.totalAmount).toBeGreaterThan(0)
  })

  test('should create a debit note via API', async ({ request }) => {
    // First, create a customer
    const customerResponse = await request.post(`${API_URL}/api/parties/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Test Customer for Debit Note',
        email: 'testcustomer2@example.com',
        gstin: '07AABCT5678M1Z5',
        phone: '+919876543211'
      }
    })

    expect(customerResponse.ok()).toBeTruthy()
    const customerData = await customerResponse.json()
    const customerId = customerData.data.id

    // Create a debit note
    const debitNoteResponse = await request.post(`${API_URL}/api/credit-debit-notes/debit`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        customerId: customerId,
        issueDate: new Date().toISOString().split('T')[0],
        reason: 'Additional shipping charges',
        notes: 'Extra charges for urgent delivery',
        lineItems: [
          {
            description: 'Shipping charges',
            hsnCode: '996511',
            quantity: 1,
            unitPrice: 500
          }
        ]
      }
    })

    expect(debitNoteResponse.ok()).toBeTruthy()
    const debitNoteData = await debitNoteResponse.json()

    expect(debitNoteData.success).toBe(true)
    expect(debitNoteData.data).toHaveProperty('id')
    expect(debitNoteData.data).toHaveProperty('debitNoteNumber')
    expect(debitNoteData.data.status).toBe('DRAFT')
  })

  test('should list all credit and debit notes', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/credit-debit-notes`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('notes')
    expect(data.data.notes).toBeInstanceOf(Array)
    expect(data.data).toHaveProperty('pagination')
  })

  test('should issue a credit note', async ({ request }) => {
    // First create a credit note
    const customerResponse = await request.post(`${API_URL}/api/parties/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Test Customer for Issue',
        email: 'testissue@example.com'
      }
    })
    const customerData = await customerResponse.json()

    const creditNoteResponse = await request.post(`${API_URL}/api/credit-debit-notes/credit`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        customerId: customerData.data.id,
        issueDate: new Date().toISOString().split('T')[0],
        reason: 'Test',
        lineItems: [
          {
            description: 'Test Item',
            quantity: 1,
            unitPrice: 100
          }
        ]
      }
    })
    const creditNoteData = await creditNoteResponse.json()
    const creditNoteId = creditNoteData.data.id

    // Issue the credit note
    const issueResponse = await request.post(`${API_URL}/api/credit-debit-notes/credit/${creditNoteId}/issue`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(issueResponse.ok()).toBeTruthy()
    const issueData = await issueResponse.json()

    expect(issueData.success).toBe(true)
    expect(issueData.data.status).toBe('ISSUED')
  })

  test('should display credit/debit notes in the web UI', async ({ page }) => {
    // Login
    await login(page)

    // Navigate to credit/debit notes section
    await page.click('text=Credit/Debit Notes')

    // Wait for the notes to load
    await page.waitForSelector('text=Credit & Debit Notes')

    // Check if the page displays the notes table
    const tableVisible = await page.isVisible('table')
    expect(tableVisible).toBeTruthy()
  })

  test('should create a credit note through the web UI', async ({ page }) => {
    // Login
    await login(page)

    // Navigate to credit/debit notes section
    await page.click('text=Credit/Debit Notes')
    await page.waitForSelector('text=Credit & Debit Notes')

    // Click create note button
    await page.click('button:has-text("Create Note")')

    // Wait for dialog to open
    await page.waitForSelector('text=Create Credit/Debit Note')

    // Fill in the form
    await page.selectOption('select[name="type"]', 'credit')

    // Select first customer from dropdown
    await page.click('button:has-text("Select customer")')
    await page.waitForTimeout(500) // Wait for dropdown
    const firstCustomer = await page.locator('[role="option"]').first()
    await firstCustomer.click()

    // Fill in reason
    await page.fill('textarea[placeholder*="reason"]', 'Test credit note via UI')

    // Add a line item
    await page.fill('input[placeholder="Item description"]', 'Test Item')
    await page.fill('input[placeholder="Qty"]', '1')
    await page.fill('input[placeholder="Rate"]', '1000')
    await page.click('button:has-text("Add")')

    // Submit the form
    await page.click('button:has-text("Create Note")')

    // Wait for success and dialog to close
    await page.waitForTimeout(2000)

    // Verify the note appears in the list
    const noteVisible = await page.isVisible('text=Test Item')
    expect(noteVisible).toBeTruthy()
  })

  test('should filter notes by status', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/credit-debit-notes?status=DRAFT`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    expect(data.success).toBe(true)
    // All returned notes should have DRAFT status
    data.data.notes.forEach(note => {
      expect(note.status).toBe('DRAFT')
    })
  })

  test('should filter notes by type (credit vs debit)', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/credit-debit-notes?type=credit`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.ok()).toBeTruthy()
    const data = await response.json()

    expect(data.success).toBe(true)
    // All returned notes should be credit notes
    data.data.notes.forEach(note => {
      expect(note.type).toBe('credit')
    })
  })
})
