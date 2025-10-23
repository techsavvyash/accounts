import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('Ledger & Accounting End-to-End Tests', () => {
  let authData: any
  let accountsReceivable: any
  let salesRevenue: any
  let cash: any

  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()

    // Get system accounts
    const accountsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/ledger/accounts',
      authData.token
    )
    const accountsResult = await accountsResponse.json()
    const accounts = accountsResult.data

    accountsReceivable = accounts.find((a: any) => a.name === 'Accounts Receivable')
    salesRevenue = accounts.find((a: any) => a.name === 'Sales Revenue')
    cash = accounts.find((a: any) => a.name === 'Cash')
  })

  it('should retrieve chart of accounts', async () => {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/ledger/accounts',
      authData.token
    )

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(Array.isArray(result.data)).toBe(true)

    // Should have system accounts
    const accountNames = result.data.map((a: any) => a.name)
    expect(accountNames).toContain('Cash')
    expect(accountNames).toContain('Accounts Receivable')
    expect(accountNames).toContain('Sales Revenue')
    expect(accountNames).toContain('GST Output Tax')
  })

  it('should create a new account', async () => {
    const accountData = {
      name: 'Office Supplies Expense',
      accountType: 'EXPENSE',
      normalBalance: 'DEBIT',
      description: 'For office supplies purchases'
    }

    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      accountData
    )

    expect(response.status).toBe(201)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.name).toBe(accountData.name)
    expect(result.data.accountType).toBe(accountData.accountType)
    expect(result.data.normalBalance).toBe(accountData.normalBalance)
  })

  it('should prevent duplicate account names', async () => {
    const accountData = {
      name: 'Test Account',
      accountType: 'EXPENSE',
      normalBalance: 'DEBIT'
    }

    // Create first account
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      accountData
    )

    // Try to create duplicate
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      accountData
    )

    expect(response.status).toBe(400)

    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })

  it('should create a balanced journal entry', async () => {
    const journalData = {
      entryDate: new Date().toISOString(),
      description: 'Test manual journal entry',
      lines: [
        {
          accountId: cash.id,
          type: 'DEBIT',
          amount: 1000,
          description: 'Cash received'
        },
        {
          accountId: salesRevenue.id,
          type: 'CREDIT',
          amount: 1000,
          description: 'Sales revenue'
        }
      ]
    }

    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      journalData
    )

    expect(response.status).toBe(201)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.description).toBe(journalData.description)
    expect(result.data.lines).toHaveLength(2)
    expect(result.data.isBalanced).toBe(true)
  })

  it('should reject unbalanced journal entry', async () => {
    const journalData = {
      entryDate: new Date().toISOString(),
      description: 'Unbalanced entry',
      lines: [
        {
          accountId: cash.id,
          type: 'DEBIT',
          amount: 1000,
          description: 'Cash'
        },
        {
          accountId: salesRevenue.id,
          type: 'CREDIT',
          amount: 500,
          description: 'Sales'
        }
      ]
    }

    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      journalData
    )

    expect(response.status).toBe(400)

    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('balanced')
  })

  it('should retrieve account ledger with running balance', async () => {
    // Create multiple journal entries affecting the same account
    const entries = [
      {
        entryDate: new Date('2024-01-01').toISOString(),
        description: 'Entry 1',
        lines: [
          { accountId: cash.id, type: 'DEBIT', amount: 1000 },
          { accountId: salesRevenue.id, type: 'CREDIT', amount: 1000 }
        ]
      },
      {
        entryDate: new Date('2024-01-02').toISOString(),
        description: 'Entry 2',
        lines: [
          { accountId: cash.id, type: 'DEBIT', amount: 500 },
          { accountId: salesRevenue.id, type: 'CREDIT', amount: 500 }
        ]
      },
      {
        entryDate: new Date('2024-01-03').toISOString(),
        description: 'Entry 3',
        lines: [
          { accountId: salesRevenue.id, type: 'DEBIT', amount: 200 },
          { accountId: cash.id, type: 'CREDIT', amount: 200 }
        ]
      }
    ]

    for (const entry of entries) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/ledger/journal-entries',
        authData.token,
        entry
      )
    }

    // Get cash account ledger
    const response = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/ledger/accounts/${cash.id}/ledger`,
      authData.token
    )

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.entries).toHaveLength(3)

    // Verify running balance (Cash is a debit account)
    // Entry 1: +1000, balance = 1000
    // Entry 2: +500, balance = 1500
    // Entry 3: -200, balance = 1300
    expect(Number(result.data.entries[0].balance)).toBe(1000)
    expect(Number(result.data.entries[1].balance)).toBe(1500)
    expect(Number(result.data.entries[2].balance)).toBe(1300)
    expect(Number(result.data.currentBalance)).toBe(1300)
  })

  it('should generate trial balance', async () => {
    // Create some journal entries
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date().toISOString(),
        description: 'Test entry',
        lines: [
          { accountId: cash.id, type: 'DEBIT', amount: 5000 },
          { accountId: salesRevenue.id, type: 'CREDIT', amount: 5000 }
        ]
      }
    )

    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date().toISOString(),
        description: 'Another entry',
        lines: [
          { accountId: accountsReceivable.id, type: 'DEBIT', amount: 2000 },
          { accountId: salesRevenue.id, type: 'CREDIT', amount: 2000 }
        ]
      }
    )

    // Generate trial balance
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/trial-balance',
      authData.token,
      {
        asOfDate: new Date().toISOString()
      }
    )

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.entries).toBeDefined()
    expect(result.data.totals).toBeDefined()

    // Trial balance should be balanced
    expect(result.data.totals.isBalanced).toBe(true)
    expect(Number(result.data.totals.debits)).toBe(Number(result.data.totals.credits))
  })

  it('should generate profit & loss statement', async () => {
    // Create revenue and expense entries
    const expenseAccount = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Rent Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT'
      }
    )
    const expenseResult = await expenseAccount.json()

    // Record some transactions
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date('2024-01-15').toISOString(),
        description: 'Sales revenue',
        lines: [
          { accountId: cash.id, type: 'DEBIT', amount: 10000 },
          { accountId: salesRevenue.id, type: 'CREDIT', amount: 10000 }
        ]
      }
    )

    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date('2024-01-20').toISOString(),
        description: 'Rent payment',
        lines: [
          { accountId: expenseResult.data.id, type: 'DEBIT', amount: 3000 },
          { accountId: cash.id, type: 'CREDIT', amount: 3000 }
        ]
      }
    )

    // Generate P&L
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/profit-loss',
      authData.token,
      {
        fromDate: new Date('2024-01-01').toISOString(),
        toDate: new Date('2024-01-31').toISOString()
      }
    )

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.revenues).toBeDefined()
    expect(result.data.expenses).toBeDefined()
    expect(result.data.summary).toBeDefined()

    // Check calculations
    expect(Number(result.data.summary.totalRevenue)).toBe(10000)
    expect(Number(result.data.summary.totalExpenses)).toBe(3000)
    expect(Number(result.data.summary.netIncome)).toBe(7000)
    expect(Number(result.data.summary.netMargin)).toBe(70) // 7000/10000 * 100
  })

  it('should generate balance sheet', async () => {
    // Create some asset, liability, and equity accounts
    const liability = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Accounts Payable',
        accountType: 'LIABILITY',
        normalBalance: 'CREDIT'
      }
    )
    const liabilityResult = await liability.json()

    const equity = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Owner\'s Equity',
        accountType: 'EQUITY',
        normalBalance: 'CREDIT'
      }
    )
    const equityResult = await equity.json()

    // Record transactions
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date().toISOString(),
        description: 'Initial capital',
        lines: [
          { accountId: cash.id, type: 'DEBIT', amount: 50000 },
          { accountId: equityResult.data.id, type: 'CREDIT', amount: 50000 }
        ]
      }
    )

    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/journal-entries',
      authData.token,
      {
        entryDate: new Date().toISOString(),
        description: 'Credit purchase',
        lines: [
          { accountId: accountsReceivable.id, type: 'DEBIT', amount: 10000 },
          { accountId: liabilityResult.data.id, type: 'CREDIT', amount: 10000 }
        ]
      }
    )

    // Generate balance sheet
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/balance-sheet',
      authData.token,
      {
        asOfDate: new Date().toISOString()
      }
    )

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.assets).toBeDefined()
    expect(result.data.liabilities).toBeDefined()
    expect(result.data.equity).toBeDefined()
    expect(result.data.summary).toBeDefined()

    // Balance sheet should be balanced
    expect(result.data.summary.isBalanced).toBe(true)
    expect(Number(result.data.summary.totalAssets)).toBe(
      Number(result.data.summary.totalLiabilitiesAndEquity)
    )
  })

  it('should handle account hierarchy', async () => {
    // Create parent account
    const parentResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Operating Expenses',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT'
      }
    )
    const parentResult = await parentResponse.json()

    // Create child account
    const childResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Utilities Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT',
        parentAccountId: parentResult.data.id
      }
    )

    expect(childResponse.status).toBe(201)

    const childResult = await childResponse.json()
    expect(childResult.success).toBe(true)
    expect(childResult.data.parentAccountId).toBe(parentResult.data.id)
  })

  it('should validate parent account compatibility', async () => {
    // Create expense account
    const expenseResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Marketing Expense',
        accountType: 'EXPENSE',
        normalBalance: 'DEBIT'
      }
    )
    const expenseResult = await expenseResponse.json()

    // Try to create revenue account as child of expense (should fail)
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/ledger/accounts',
      authData.token,
      {
        name: 'Service Revenue',
        accountType: 'REVENUE',
        normalBalance: 'CREDIT',
        parentAccountId: expenseResult.data.id
      }
    )

    expect(response.status).toBe(400)

    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('same account type')
  })
})
