import { Elysia, t } from 'elysia'
import { prisma } from '@accounts/database'
import { LedgerService } from '../services/ledger'
import { requirePermission, tenantScope } from '../middleware/auth'

export const ledgerRoutes = new Elysia({ prefix: '/ledger' })
  // Journal Entries
  .group('/journal-entries', (app) =>
    app
      .post(
        '/',
        async ({ body, store, set, posthog }) => {
          try {
            const journalEntry = await LedgerService.createJournalEntry(
              store.tenantId,
              store.userId,
              {
                entryDate: new Date(body.entryDate),
                description: body.description,
                referenceType: body.referenceType,
                referenceId: body.referenceId,
                lines: body.lines
              }
            )

            posthog?.track('journal_entry.created', {
              journalEntryId: journalEntry.id,
              linesCount: body.lines.length
            })

            return {
              success: true,
              message: 'Journal entry created successfully',
              data: journalEntry
            }
          } catch (error: any) {
            set.status = 400
            return {
              error: 'Bad Request',
              message: error.message
            }
          }
        },
        {
          beforeHandle: requirePermission('journal_entry', 'create'),
          body: t.Object({
            entryDate: t.String({ format: 'date' }),
            description: t.Optional(t.String()),
            referenceType: t.Optional(t.String()),
            referenceId: t.Optional(t.String()),
            lines: t.Array(
              t.Object({
                accountId: t.String(),
                type: t.Union([t.Literal('DEBIT'), t.Literal('CREDIT')]),
                amount: t.Number({ minimum: 0.01 }),
                description: t.Optional(t.String())
              }),
              { minItems: 2 }
            )
          })
        }
      )
      .get(
        '/:id',
        async ({ params, store, set }) => {
          try {
            const journalEntry = await prisma.journalEntry.findFirst({
              where: {
                id: params.id,
                tenantId: store.tenantId
              },
              include: {
                lines: {
                  include: {
                    account: {
                      select: {
                        id: true,
                        name: true,
                        accountType: true
                      }
                    }
                  }
                }
              }
            })

            if (!journalEntry) {
              set.status = 404
              return {
                error: 'Not Found',
                message: 'Journal entry not found'
              }
            }

            return {
              success: true,
              data: journalEntry
            }
          } catch (error: any) {
            set.status = 500
            return {
              error: 'Internal Server Error',
              message: 'Failed to fetch journal entry'
            }
          }
        },
        {
          beforeHandle: requirePermission('journal_entry', 'read'),
          params: t.Object({
            id: t.String()
          })
        }
      )
  )
  
  // Chart of Accounts
  .group('/accounts', (app) =>
    app
      .get(
        '/',
        async ({ store, query, posthog }) => {
          try {
            const chartOfAccounts = await LedgerService.getChartOfAccounts(store.tenantId)

            posthog?.track('chart_of_accounts.viewed', {
              totalAccounts: chartOfAccounts.summary.totalAccounts
            })

            return {
              success: true,
              data: chartOfAccounts
            }
          } catch (error: any) {
            return {
              error: 'Internal Server Error',
              message: 'Failed to fetch chart of accounts'
            }
          }
        },
        {
          beforeHandle: requirePermission('account', 'read')
        }
      )
      .post(
        '/',
        async ({ body, store, set, posthog }) => {
          try {
            const account = await LedgerService.createAccount(
              store.tenantId,
              store.userId,
              body
            )

            posthog?.track('account.created', {
              accountId: account.id,
              accountType: body.accountType
            })

            return {
              success: true,
              message: 'Account created successfully',
              data: account
            }
          } catch (error: any) {
            set.status = 400
            return {
              error: 'Bad Request',
              message: error.message
            }
          }
        },
        {
          beforeHandle: requirePermission('account', 'create'),
          body: t.Object({
            name: t.String({ minLength: 1, maxLength: 255 }),
            accountType: t.Union([
              t.Literal('ASSET'),
              t.Literal('LIABILITY'),
              t.Literal('EQUITY'),
              t.Literal('REVENUE'),
              t.Literal('EXPENSE')
            ]),
            normalBalance: t.Union([
              t.Literal('DEBIT'),
              t.Literal('CREDIT')
            ]),
            parentAccountId: t.Optional(t.String())
          })
        }
      )
      .get(
        '/:id/ledger',
        async ({ params, query, store, set }) => {
          try {
            const ledger = await LedgerService.getAccountLedger(
              store.tenantId,
              params.id,
              {
                fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
                toDate: query.toDate ? new Date(query.toDate) : undefined,
                page: query.page ? parseInt(query.page) : undefined,
                limit: query.limit ? parseInt(query.limit) : undefined
              }
            )

            return {
              success: true,
              data: ledger
            }
          } catch (error: any) {
            if (error.message === 'Account not found') {
              set.status = 404
              return {
                error: 'Not Found',
                message: error.message
              }
            }

            set.status = 500
            return {
              error: 'Internal Server Error',
              message: 'Failed to fetch account ledger'
            }
          }
        },
        {
          beforeHandle: requirePermission('account', 'read'),
          params: t.Object({
            id: t.String()
          }),
          query: t.Object({
            fromDate: t.Optional(t.String({ format: 'date' })),
            toDate: t.Optional(t.String({ format: 'date' })),
            page: t.Optional(t.String()),
            limit: t.Optional(t.String())
          })
        }
      )
  )
  
  // Reports
  .group('/reports', (app) =>
    app
      .get(
        '/trial-balance',
        async ({ query, store, posthog }) => {
          try {
            const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date()
            const trialBalance = await LedgerService.getTrialBalance(store.tenantId, asOfDate)

            posthog?.track('trial_balance.generated', {
              asOfDate: asOfDate.toISOString(),
              totalAccounts: trialBalance.entries.length,
              isBalanced: trialBalance.totals.isBalanced
            })

            return {
              success: true,
              data: trialBalance
            }
          } catch (error: any) {
            return {
              error: 'Internal Server Error',
              message: 'Failed to generate trial balance'
            }
          }
        },
        {
          beforeHandle: requirePermission('report_financial', 'read'),
          query: t.Object({
            asOfDate: t.Optional(t.String({ format: 'date' }))
          })
        }
      )
      .get(
        '/profit-loss',
        async ({ query, store, posthog }) => {
          try {
            const fromDate = new Date(query.fromDate)
            const toDate = new Date(query.toDate)
            
            if (fromDate >= toDate) {
              return {
                error: 'Bad Request',
                message: 'From date must be before to date'
              }
            }

            const profitLoss = await LedgerService.getProfitLossStatement(
              store.tenantId,
              fromDate,
              toDate
            )

            posthog?.track('profit_loss.generated', {
              fromDate: fromDate.toISOString(),
              toDate: toDate.toISOString(),
              netIncome: profitLoss.summary.netIncome,
              netMargin: profitLoss.summary.netMargin
            })

            return {
              success: true,
              data: profitLoss
            }
          } catch (error: any) {
            return {
              error: 'Internal Server Error',
              message: 'Failed to generate profit & loss statement'
            }
          }
        },
        {
          beforeHandle: requirePermission('report_financial', 'read'),
          query: t.Object({
            fromDate: t.String({ format: 'date' }),
            toDate: t.String({ format: 'date' })
          })
        }
      )
      .get(
        '/balance-sheet',
        async ({ query, store, posthog }) => {
          try {
            const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date()
            const balanceSheet = await LedgerService.getBalanceSheet(store.tenantId, asOfDate)

            posthog?.track('balance_sheet.generated', {
              asOfDate: asOfDate.toISOString(),
              totalAssets: balanceSheet.summary.totalAssets,
              totalLiabilities: balanceSheet.summary.totalLiabilities,
              isBalanced: balanceSheet.summary.isBalanced
            })

            return {
              success: true,
              data: balanceSheet
            }
          } catch (error: any) {
            return {
              error: 'Internal Server Error',
              message: 'Failed to generate balance sheet'
            }
          }
        },
        {
          beforeHandle: requirePermission('report_financial', 'read'),
          query: t.Object({
            asOfDate: t.Optional(t.String({ format: 'date' }))
          })
        }
      )
  )