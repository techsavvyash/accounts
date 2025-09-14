import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = 
  globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export Prisma client types
export * from '@prisma/client'

// Utility functions for common operations
export const db = {
  // Tenant utilities
  async createTenantWithDefaults(tenantData: { name: string; gstin?: string; pan?: string }) {
    return await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: tenantData
      })

      // Create default chart of accounts
      const defaultAccounts = [
        { name: 'Cash', accountType: 'ASSET', normalBalance: 'DEBIT' },
        { name: 'Accounts Receivable', accountType: 'ASSET', normalBalance: 'DEBIT' },
        { name: 'Inventory', accountType: 'ASSET', normalBalance: 'DEBIT' },
        { name: 'Accounts Payable', accountType: 'LIABILITY', normalBalance: 'CREDIT' },
        { name: 'Sales Revenue', accountType: 'REVENUE', normalBalance: 'CREDIT' },
        { name: 'Cost of Goods Sold', accountType: 'EXPENSE', normalBalance: 'DEBIT' },
        { name: 'GST Input Tax Credit', accountType: 'ASSET', normalBalance: 'DEBIT' },
        { name: 'GST Output Tax', accountType: 'LIABILITY', normalBalance: 'CREDIT' }
      ]

      for (const account of defaultAccounts) {
        await tx.account.create({
          data: {
            ...account,
            tenantId: tenant.id,
            isSystemAccount: true
          } as any
        })
      }

      // Create default warehouse
      await tx.warehouse.create({
        data: {
          tenantId: tenant.id,
          name: 'Main Warehouse',
          location: 'Default Location',
          isDefault: true
        }
      })

      return tenant
    })
  },

  // Journal entry utilities
  async createJournalEntry(
    tenantId: string, 
    createdBy: string,
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
    // Validate that entry is balanced
    const totalDebits = entryData.lines
      .filter(line => line.type === 'DEBIT')
      .reduce((sum, line) => sum + line.amount, 0)
    
    const totalCredits = entryData.lines
      .filter(line => line.type === 'CREDIT')
      .reduce((sum, line) => sum + line.amount, 0)

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Journal entry is not balanced: Debits ${totalDebits}, Credits ${totalCredits}`)
    }

    return await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          tenantId,
          createdBy,
          entryDate: entryData.entryDate,
          description: entryData.description,
          referenceType: entryData.referenceType,
          referenceId: entryData.referenceId
        }
      })

      for (const line of entryData.lines) {
        await tx.journalEntryLine.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: line.accountId,
            type: line.type,
            amount: line.amount,
            description: line.description
          } as any
        })
      }

      return journalEntry
    })
  },

  // Stock movement utilities
  async updateStockLevel(
    tenantId: string,
    inventoryItemId: string,
    warehouseId: string,
    quantity: number,
    reason: 'SALE' | 'PURCHASE_RECEIPT' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'TRANSFER',
    createdBy: string,
    referenceId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          tenantId,
          inventoryItemId,
          toWarehouseId: reason === 'SALE' ? null : warehouseId,
          fromWarehouseId: reason === 'PURCHASE_RECEIPT' ? null : warehouseId,
          quantity,
          reason: reason as any,
          referenceId,
          createdBy
        }
      })

      // Update current stock level
      const currentStock = await tx.stockLevel.findUnique({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId,
            warehouseId
          }
        }
      })

      const newQuantity = (currentStock?.quantityOnHand || 0) + 
        (reason === 'SALE' ? -quantity : quantity)

      await tx.stockLevel.upsert({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId,
            warehouseId
          }
        },
        create: {
          inventoryItemId,
          warehouseId,
          quantityOnHand: newQuantity
        },
        update: {
          quantityOnHand: newQuantity,
          lastUpdated: new Date()
        }
      })

      return newQuantity
    })
  }
}

export default prisma