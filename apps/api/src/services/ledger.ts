import { prisma, db } from '@accounts/database'
import { trackEvent } from '../middleware/posthog'

export class LedgerService {
  /**
   * Create a balanced journal entry following double-entry bookkeeping principles
   */
  static async createJournalEntry(
    tenantId: string,
    userId: string,
    entryData: {
      entryDate: Date
      description?: string
      referenceType?: string
      referenceId?: string
      lines: Array<{
        accountId: string
        type: 'DEBIT' | 'CREDIT'
        amount: number
        description?: string
      }>
    }
  ) {
    // Use the utility function from database package
    const journalEntry = await db.createJournalEntry(tenantId, userId, entryData)
    
    // Track the event
    trackEvent('journal_entry.created', {
      journalEntryId: journalEntry.id,
      referenceType: entryData.referenceType,
      linesCount: entryData.lines.length,
      totalAmount: entryData.lines
        .filter(line => line.type === 'DEBIT')
        .reduce((sum, line) => sum + line.amount, 0)
    }, userId, tenantId)

    return journalEntry
  }

  /**
   * Get account ledger with running balance
   */
  static async getAccountLedger(
    tenantId: string,
    accountId: string,
    options: {
      fromDate?: Date
      toDate?: Date
      page?: number
      limit?: number
    } = {}
  ) {
    const { fromDate, toDate, page = 1, limit = 50 } = options

    // Get account details
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        tenantId
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Build where clause
    const whereClause: any = {
      journalEntry: {
        tenantId
      },
      accountId
    }

    if (fromDate || toDate) {
      whereClause.journalEntry.entryDate = {}
      if (fromDate) whereClause.journalEntry.entryDate.gte = fromDate
      if (toDate) whereClause.journalEntry.entryDate.lte = toDate
    }

    // Get ledger entries with pagination
    const [entries, totalCount] = await Promise.all([
      prisma.journalEntryLine.findMany({
        where: whereClause,
        include: {
          journalEntry: {
            select: {
              id: true,
              entryDate: true,
              description: true,
              referenceType: true,
              referenceId: true
            }
          }
        },
        orderBy: {
          journalEntry: {
            entryDate: 'asc'
          }
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.journalEntryLine.count({
        where: whereClause
      })
    ])

    // Calculate running balance
    let runningBalance = 0
    const ledgerEntries = entries.map(entry => {
      const amount = entry.amount.toNumber()
      const isDebit = entry.type === 'DEBIT'
      const isNormalDebit = account.normalBalance === 'DEBIT'

      // Calculate balance based on account's normal balance
      if ((isDebit && isNormalDebit) || (!isDebit && !isNormalDebit)) {
        runningBalance += amount
      } else {
        runningBalance -= amount
      }

      return {
        id: entry.id,
        journalEntryId: entry.journalEntry.id,
        date: entry.journalEntry.entryDate,
        description: entry.description || entry.journalEntry.description,
        referenceType: entry.journalEntry.referenceType,
        referenceId: entry.journalEntry.referenceId,
        type: entry.type,
        amount: amount,
        balance: runningBalance
      }
    })

    return {
      account: {
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance
      },
      entries: ledgerEntries,
      currentBalance: runningBalance,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  }

  /**
   * Generate trial balance for a given date
   */
  static async getTrialBalance(tenantId: string, asOfDate: Date) {
    // Get all active accounts for the tenant
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true
      },
      orderBy: [
        { accountType: 'asc' },
        { name: 'asc' }
      ]
    })

    // Get all journal entry lines up to the specified date
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          entryDate: {
            lte: asOfDate
          }
        }
      },
      include: {
        account: true
      }
    })

    // Calculate balances for each account
    const accountBalances = new Map<string, {
      debitBalance: number
      creditBalance: number
      netBalance: number
    }>()

    // Initialize all accounts with zero balances
    accounts.forEach(account => {
      accountBalances.set(account.id, {
        debitBalance: 0,
        creditBalance: 0,
        netBalance: 0
      })
    })

    // Calculate balances from journal entries
    journalLines.forEach(line => {
      const accountId = line.accountId
      const amount = line.amount.toNumber()
      const current = accountBalances.get(accountId) || {
        debitBalance: 0,
        creditBalance: 0,
        netBalance: 0
      }

      if (line.type === 'DEBIT') {
        current.debitBalance += amount
      } else {
        current.creditBalance += amount
      }

      // Calculate net balance based on account's normal balance
      const account = line.account
      if (account.normalBalance === 'DEBIT') {
        current.netBalance = current.debitBalance - current.creditBalance
      } else {
        current.netBalance = current.creditBalance - current.debitBalance
      }

      accountBalances.set(accountId, current)
    })

    // Build trial balance report
    const trialBalanceEntries = accounts.map(account => {
      const balances = accountBalances.get(account.id) || {
        debitBalance: 0,
        creditBalance: 0,
        netBalance: 0
      }

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        debitBalance: balances.netBalance > 0 ? balances.netBalance : 0,
        creditBalance: balances.netBalance < 0 ? Math.abs(balances.netBalance) : 0,
        netBalance: balances.netBalance
      }
    }).filter(entry => 
      // Only include accounts with non-zero balances
      entry.debitBalance !== 0 || entry.creditBalance !== 0
    )

    // Calculate totals
    const totalDebits = trialBalanceEntries.reduce((sum, entry) => sum + entry.debitBalance, 0)
    const totalCredits = trialBalanceEntries.reduce((sum, entry) => sum + entry.creditBalance, 0)

    return {
      asOfDate,
      entries: trialBalanceEntries,
      totals: {
        debits: totalDebits,
        credits: totalCredits,
        difference: totalDebits - totalCredits, // Should always be 0
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    }
  }

  /**
   * Get chart of accounts for a tenant
   */
  static async getChartOfAccounts(tenantId: string) {
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        isActive: true
      },
      include: {
        parentAccount: {
          select: {
            id: true,
            name: true
          }
        },
        childAccounts: {
          select: {
            id: true,
            name: true,
            accountType: true
          }
        }
      },
      orderBy: [
        { accountType: 'asc' },
        { name: 'asc' }
      ]
    })

    // Group accounts by type
    const groupedAccounts = accounts.reduce((groups: any, account) => {
      const type = account.accountType
      if (!groups[type]) {
        groups[type] = []
      }
      
      groups[type].push({
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        parentAccount: account.parentAccount,
        childAccounts: account.childAccounts,
        isSystemAccount: account.isSystemAccount
      })

      return groups
    }, {})

    return {
      accounts: groupedAccounts,
      summary: {
        totalAccounts: accounts.length,
        accountsByType: {
          ASSET: groupedAccounts.ASSET?.length || 0,
          LIABILITY: groupedAccounts.LIABILITY?.length || 0,
          EQUITY: groupedAccounts.EQUITY?.length || 0,
          REVENUE: groupedAccounts.REVENUE?.length || 0,
          EXPENSE: groupedAccounts.EXPENSE?.length || 0
        }
      }
    }
  }

  /**
   * Create a new account
   */
  static async createAccount(
    tenantId: string,
    userId: string,
    accountData: {
      name: string
      accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
      normalBalance: 'DEBIT' | 'CREDIT'
      parentAccountId?: string
    }
  ) {
    // Validate parent account if specified
    if (accountData.parentAccountId) {
      const parentAccount = await prisma.account.findFirst({
        where: {
          id: accountData.parentAccountId,
          tenantId
        }
      })

      if (!parentAccount) {
        throw new Error('Parent account not found')
      }

      // Validate that parent and child have the same account type
      if (parentAccount.accountType !== accountData.accountType) {
        throw new Error('Parent and child accounts must have the same account type')
      }
    }

    // Check if account name already exists for this tenant
    const existingAccount = await prisma.account.findFirst({
      where: {
        tenantId,
        name: accountData.name
      }
    })

    if (existingAccount) {
      throw new Error('Account with this name already exists')
    }

    const account = await prisma.account.create({
      data: {
        ...accountData,
        tenantId
      },
      include: {
        parentAccount: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Track the event
    trackEvent('account.created', {
      accountId: account.id,
      accountType: account.accountType,
      hasParent: !!account.parentAccountId
    }, userId, tenantId)

    return account
  }

  /**
   * Get profit & loss statement
   */
  static async getProfitLossStatement(
    tenantId: string,
    fromDate: Date,
    toDate: Date
  ) {
    // Get revenue and expense accounts
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        accountType: {
          in: ['REVENUE', 'EXPENSE']
        },
        isActive: true
      }
    })

    // Get journal entry lines for the period
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          entryDate: {
            gte: fromDate,
            lte: toDate
          }
        },
        account: {
          accountType: {
            in: ['REVENUE', 'EXPENSE']
          }
        }
      },
      include: {
        account: true
      }
    })

    // Calculate account balances
    const accountBalances = new Map<string, number>()
    
    journalLines.forEach(line => {
      const accountId = line.accountId
      const amount = line.amount.toNumber()
      const isCredit = line.type === 'CREDIT'
      const isRevenueAccount = line.account.accountType === 'REVENUE'

      const currentBalance = accountBalances.get(accountId) || 0

      // Revenue accounts increase with credits, expense accounts increase with debits
      if ((isRevenueAccount && isCredit) || (!isRevenueAccount && !isCredit)) {
        accountBalances.set(accountId, currentBalance + amount)
      } else {
        accountBalances.set(accountId, currentBalance - amount)
      }
    })

    // Build P&L structure
    const revenues = accounts
      .filter(acc => acc.accountType === 'REVENUE')
      .map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: accountBalances.get(acc.id) || 0
      }))
      .filter(acc => acc.amount !== 0)

    const expenses = accounts
      .filter(acc => acc.accountType === 'EXPENSE')
      .map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: accountBalances.get(acc.id) || 0
      }))
      .filter(acc => acc.amount !== 0)

    const totalRevenue = revenues.reduce((sum, acc) => sum + acc.amount, 0)
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0)
    const netIncome = totalRevenue - totalExpenses

    return {
      period: {
        fromDate,
        toDate
      },
      revenues,
      expenses,
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      }
    }
  }

  /**
   * Get balance sheet
   */
  static async getBalanceSheet(tenantId: string, asOfDate: Date) {
    // Get assets, liabilities, and equity accounts
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        accountType: {
          in: ['ASSET', 'LIABILITY', 'EQUITY']
        },
        isActive: true
      }
    })

    // Get journal entry lines up to the specified date
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          entryDate: {
            lte: asOfDate
          }
        },
        account: {
          accountType: {
            in: ['ASSET', 'LIABILITY', 'EQUITY']
          }
        }
      },
      include: {
        account: true
      }
    })

    // Calculate account balances
    const accountBalances = new Map<string, number>()

    journalLines.forEach(line => {
      const accountId = line.accountId
      const amount = line.amount.toNumber()
      const isDebit = line.type === 'DEBIT'
      const account = line.account
      
      const currentBalance = accountBalances.get(accountId) || 0

      // Calculate balance based on account's normal balance
      if ((isDebit && account.normalBalance === 'DEBIT') || 
          (!isDebit && account.normalBalance === 'CREDIT')) {
        accountBalances.set(accountId, currentBalance + amount)
      } else {
        accountBalances.set(accountId, currentBalance - amount)
      }
    })

    // Build balance sheet structure
    const assets = accounts
      .filter(acc => acc.accountType === 'ASSET')
      .map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: accountBalances.get(acc.id) || 0
      }))
      .filter(acc => acc.amount !== 0)

    const liabilities = accounts
      .filter(acc => acc.accountType === 'LIABILITY')
      .map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: accountBalances.get(acc.id) || 0
      }))
      .filter(acc => acc.amount !== 0)

    const equity = accounts
      .filter(acc => acc.accountType === 'EQUITY')
      .map(acc => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: accountBalances.get(acc.id) || 0
      }))
      .filter(acc => acc.amount !== 0)

    const totalAssets = assets.reduce((sum, acc) => sum + acc.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.amount, 0)
    const totalEquity = equity.reduce((sum, acc) => sum + acc.amount, 0)

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
      }
    }
  }
}