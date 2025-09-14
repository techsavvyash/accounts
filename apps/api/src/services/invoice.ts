import { prisma } from '@accounts/database'
import { LedgerService } from './ledger'
import { trackEvent } from '../middleware/posthog'
import { publishWebhookEvent } from './webhook'
import { WebhookEventType } from '@accounts/webhooks'

export class InvoiceService {
  /**
   * Check stock availability for invoice items
   */
  static async checkStockAvailability(
    tenantId: string,
    lineItems: Array<{
      inventoryItemId?: string
      description: string
      quantity: number
      unitPrice: number
    }>
  ) {
    const stockWarnings = []

    for (const item of lineItems) {
      if (item.inventoryItemId) {
        // Get current stock levels for this inventory item
        const stockLevels = await prisma.stockLevel.findMany({
          where: {
            inventoryItemId: item.inventoryItemId,
            inventoryItem: {
              tenantId
            }
          },
          include: {
            inventoryItem: {
              select: {
                name: true,
                sku: true
              }
            },
            warehouse: {
              select: {
                name: true,
                isDefault: true
              }
            }
          }
        })

        // Calculate total available stock
        const totalAvailableStock = stockLevels.reduce(
          (sum, level) => sum + (level.quantityOnHand.toNumber() - level.committedQuantity.toNumber()),
          0
        )

        // Check if requested quantity exceeds available stock
        if (totalAvailableStock < item.quantity) {
          stockWarnings.push({
            inventoryItemId: item.inventoryItemId,
            productName: stockLevels[0]?.inventoryItem.name || item.description,
            sku: stockLevels[0]?.inventoryItem.sku,
            requestedQuantity: item.quantity,
            availableStock: totalAvailableStock,
            isOutOfStock: totalAvailableStock === 0,
            isInsufficientStock: totalAvailableStock > 0 && totalAvailableStock < item.quantity,
            stockLevels: stockLevels.map(level => ({
              warehouseName: level.warehouse.name,
              isDefault: level.warehouse.isDefault,
              quantityOnHand: level.quantityOnHand.toNumber(),
              availableQuantity: level.quantityOnHand.toNumber() - level.committedQuantity.toNumber()
            }))
          })
        }
      }
    }

    return {
      hasStockIssues: stockWarnings.length > 0,
      stockWarnings
    }
  }

  /**
   * Create a new invoice in DRAFT status
   */
  static async createInvoice(
    tenantId: string,
    userId: string,
    invoiceData: {
      customerId: string
      invoiceDate: Date
      dueDate?: Date
      lineItems: Array<{
        inventoryItemId?: string
        description: string
        quantity: number
        unitPrice: number
        taxRateId?: string
      }>
      notes?: string
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Check stock availability before creating invoice
      const stockCheck = await InvoiceService.checkStockAvailability(tenantId, invoiceData.lineItems)

      // Generate invoice number
      const invoiceCount = await tx.invoice.count({
        where: { tenantId }
      })
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

      // Calculate totals
      let subtotal = 0
      let totalTax = 0

      const processedLineItems = await Promise.all(
        invoiceData.lineItems.map(async (item) => {
          const lineTotal = item.quantity * item.unitPrice
          subtotal += lineTotal

          // Get tax rate if specified
          let tax = 0
          if (item.taxRateId) {
            const taxRate = await tx.taxRate.findUnique({
              where: { id: item.taxRateId }
            })
            if (taxRate) {
              // For now, using IGST for simplicity - will enhance for intra/interstate logic
              tax = (lineTotal * taxRate.igst.toNumber()) / 100
              totalTax += tax
            }
          }

          return {
            ...item,
            lineTotal,
            taxAmount: tax
          }
        })
      )

      const totalAmount = subtotal + totalTax

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          customerId: invoiceData.customerId,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          status: 'DRAFT',
          totalAmount,
          taxAmount: totalTax,
          notes: invoiceData.notes
        },
        include: {
          customer: true
        }
      })

      // Create line items
      for (const item of processedLineItems) {
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRateId: item.taxRateId,
            lineTotal: item.lineTotal
          }
        })
      }

      // Track event
      trackEvent('invoice.created', {
        invoiceId: invoice.id,
        totalAmount,
        lineItemsCount: processedLineItems.length,
        customerId: invoiceData.customerId
      }, userId, tenantId)

      // Publish webhook event
      await publishWebhookEvent(
        WebhookEventType.INVOICE_CREATED,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customer.name,
          amount: totalAmount,
          taxAmount: totalTax,
          status: invoice.status,
          dueDate: invoice.dueDate?.toISOString(),
          lineItems: processedLineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.unitPrice,
            amount: item.quantity * item.unitPrice
          }))
        },
        tenantId,
        userId
      )

      return invoice
    })
  }

  /**
   * Send invoice - transition from DRAFT to SENT and create journal entry
   */
  static async sendInvoice(
    tenantId: string,
    userId: string,
    invoiceId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get invoice with customer details
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          status: 'DRAFT'
        },
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true
            }
          }
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found or not in DRAFT status')
      }

      // Get required accounts
      const [accountsReceivable, salesRevenue, gstOutput] = await Promise.all([
        tx.account.findFirst({
          where: { tenantId, name: 'Accounts Receivable', isSystemAccount: true }
        }),
        tx.account.findFirst({
          where: { tenantId, name: 'Sales Revenue', isSystemAccount: true }
        }),
        tx.account.findFirst({
          where: { tenantId, name: 'GST Output Tax', isSystemAccount: true }
        })
      ])

      if (!accountsReceivable || !salesRevenue) {
        throw new Error('Required accounts not found. Please run database seed.')
      }

      // Create journal entry for the invoice
      const journalEntryLines = [
        // Debit Accounts Receivable
        {
          accountId: accountsReceivable.id,
          type: 'DEBIT' as const,
          amount: invoice.totalAmount.toNumber(),
          description: `Invoice ${invoice.invoiceNumber} - ${invoice.customer.name}`
        },
        // Credit Sales Revenue
        {
          accountId: salesRevenue.id,
          type: 'CREDIT' as const,
          amount: (invoice.totalAmount.toNumber() - invoice.taxAmount.toNumber()),
          description: `Sales Revenue - Invoice ${invoice.invoiceNumber}`
        }
      ]

      // Add GST liability if there's tax
      if (invoice.taxAmount.toNumber() > 0 && gstOutput) {
        journalEntryLines.push({
          accountId: gstOutput.id,
          type: 'CREDIT' as const,
          amount: invoice.taxAmount.toNumber(),
          description: `GST Output Tax - Invoice ${invoice.invoiceNumber}`
        })
      }

      // Create the journal entry
      const journalEntry = await LedgerService.createJournalEntry(
        tenantId,
        userId,
        {
          entryDate: invoice.invoiceDate,
          description: `Invoice ${invoice.invoiceNumber} sent to ${invoice.customer.name}`,
          referenceType: 'invoice',
          referenceId: invoice.id,
          lines: journalEntryLines
        }
      )

      // Update invoice status and link to journal entry
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'SENT',
          linkedJournalEntryId: journalEntry.id
        },
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true
            }
          }
        }
      })

      // Update inventory levels for tracked items
      for (const lineItem of invoice.lineItems) {
        if (lineItem.inventoryItem) {
          // Get default warehouse
          const defaultWarehouse = await tx.warehouse.findFirst({
            where: { tenantId, isDefault: true }
          })

          if (defaultWarehouse) {
            // Update stock level using the utility function
            // Note: This would typically be done via an event system
            await tx.stockLevel.upsert({
              where: {
                inventoryItemId_warehouseId: {
                  inventoryItemId: lineItem.inventoryItem.id,
                  warehouseId: defaultWarehouse.id
                }
              },
              create: {
                inventoryItemId: lineItem.inventoryItem.id,
                warehouseId: defaultWarehouse.id,
                quantityOnHand: -lineItem.quantity.toNumber()
              },
              update: {
                quantityOnHand: {
                  decrement: lineItem.quantity.toNumber()
                },
                lastUpdated: new Date()
              }
            })

            // Create stock movement record
            await tx.stockMovement.create({
              data: {
                tenantId,
                inventoryItemId: lineItem.inventoryItem.id,
                fromWarehouseId: defaultWarehouse.id,
                quantity: lineItem.quantity.toNumber(),
                reason: 'SALE',
                referenceId: invoice.id,
                createdBy: userId
              }
            })
          }
        }
      }

      // Track event
      trackEvent('invoice.sent', {
        invoiceId: invoice.id,
        totalAmount: invoice.totalAmount.toNumber(),
        journalEntryId: journalEntry.id
      }, userId, tenantId)

      return updatedInvoice
    })
  }

  /**
   * Record payment for an invoice
   */
  static async recordPayment(
    tenantId: string,
    userId: string,
    invoiceId: string,
    paymentData: {
      amount: number
      paymentDate: Date
      paymentMethod: string
      referenceNo?: string
      notes?: string
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get invoice
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          status: { in: ['SENT', 'PARTIALLY_PAID'] }
        },
        include: {
          customer: true
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found or cannot be paid')
      }

      // Validate payment amount
      const totalPaid = await tx.payment.aggregate({
        where: { invoiceId },
        _sum: { amount: true }
      })

      const currentlyPaid = totalPaid._sum.amount?.toNumber() || 0
      const remainingAmount = invoice.totalAmount.toNumber() - currentlyPaid

      if (paymentData.amount > remainingAmount) {
        throw new Error('Payment amount exceeds remaining balance')
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          referenceNo: paymentData.referenceNo,
          notes: paymentData.notes
        }
      })

      // Get required accounts
      const [cash, accountsReceivable] = await Promise.all([
        tx.account.findFirst({
          where: { tenantId, name: 'Cash', isSystemAccount: true }
        }),
        tx.account.findFirst({
          where: { tenantId, name: 'Accounts Receivable', isSystemAccount: true }
        })
      ])

      if (!cash || !accountsReceivable) {
        throw new Error('Required accounts not found')
      }

      // Create journal entry for payment
      const journalEntry = await LedgerService.createJournalEntry(
        tenantId,
        userId,
        {
          entryDate: paymentData.paymentDate,
          description: `Payment received for Invoice ${invoice.invoiceNumber} from ${invoice.customer.name}`,
          referenceType: 'payment',
          referenceId: payment.id,
          lines: [
            // Debit Cash
            {
              accountId: cash.id,
              type: 'DEBIT',
              amount: paymentData.amount,
              description: `Payment received - ${paymentData.paymentMethod}`
            },
            // Credit Accounts Receivable
            {
              accountId: accountsReceivable.id,
              type: 'CREDIT',
              amount: paymentData.amount,
              description: `Payment for Invoice ${invoice.invoiceNumber}`
            }
          ]
        }
      )

      // Update invoice status
      const newTotalPaid = currentlyPaid + paymentData.amount
      const newStatus = newTotalPaid >= invoice.totalAmount.toNumber() ? 'PAID' : 'PARTIALLY_PAID'

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus }
      })

      // Track event
      trackEvent('invoice.payment_recorded', {
        invoiceId,
        paymentAmount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        newStatus,
        journalEntryId: journalEntry.id
      }, userId, tenantId)

      return {
        payment,
        invoice: {
          id: invoice.id,
          status: newStatus,
          totalAmount: invoice.totalAmount.toNumber(),
          totalPaid: newTotalPaid,
          remainingAmount: invoice.totalAmount.toNumber() - newTotalPaid
        }
      }
    })
  }

  /**
   * Void an invoice
   */
  static async voidInvoice(
    tenantId: string,
    userId: string,
    invoiceId: string,
    reason?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get invoice
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          status: { in: ['DRAFT', 'SENT'] }
        },
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true
            }
          }
        }
      })

      if (!invoice) {
        throw new Error('Invoice not found or cannot be voided')
      }

      // If invoice was sent, we need to create a reversing journal entry
      if (invoice.status === 'SENT' && invoice.linkedJournalEntryId) {
        // Get the original journal entry
        const originalEntry = await tx.journalEntry.findUnique({
          where: { id: invoice.linkedJournalEntryId },
          include: { lines: true }
        })

        if (originalEntry) {
          // Create reversing entry by flipping debits and credits
          const reversingLines = originalEntry.lines.map(line => ({
            accountId: line.accountId,
            type: line.type === 'DEBIT' ? 'CREDIT' as const : 'DEBIT' as const,
            amount: line.amount.toNumber(),
            description: `Reversal - ${line.description || ''}`
          }))

          await LedgerService.createJournalEntry(
            tenantId,
            userId,
            {
              entryDate: new Date(),
              description: `Reversal of Invoice ${invoice.invoiceNumber} - ${reason || 'Invoice voided'}`,
              referenceType: 'invoice_reversal',
              referenceId: invoice.id,
              lines: reversingLines
            }
          )

          // Restore inventory levels if needed
          for (const lineItem of invoice.lineItems) {
            if (lineItem.inventoryItem) {
              const defaultWarehouse = await tx.warehouse.findFirst({
                where: { tenantId, isDefault: true }
              })

              if (defaultWarehouse) {
                // Restore stock
                await tx.stockLevel.upsert({
                  where: {
                    inventoryItemId_warehouseId: {
                      inventoryItemId: lineItem.inventoryItem.id,
                      warehouseId: defaultWarehouse.id
                    }
                  },
                  create: {
                    inventoryItemId: lineItem.inventoryItem.id,
                    warehouseId: defaultWarehouse.id,
                    quantityOnHand: lineItem.quantity.toNumber()
                  },
                  update: {
                    quantityOnHand: {
                      increment: lineItem.quantity.toNumber()
                    },
                    lastUpdated: new Date()
                  }
                })

                // Create stock movement record
                await tx.stockMovement.create({
                  data: {
                    tenantId,
                    inventoryItemId: lineItem.inventoryItem.id,
                    toWarehouseId: defaultWarehouse.id,
                    quantity: lineItem.quantity.toNumber(),
                    reason: 'ADJUSTMENT_IN',
                    referenceId: invoice.id,
                    createdBy: userId
                  }
                })
              }
            }
          }
        }
      }

      // Update invoice status
      const voidedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: 'VOID',
          notes: invoice.notes ? `${invoice.notes}\n\nVOIDED: ${reason || 'No reason provided'}` : `VOIDED: ${reason || 'No reason provided'}`
        },
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true
            }
          }
        }
      })

      // Track event
      trackEvent('invoice.voided', {
        invoiceId,
        reason,
        originalStatus: invoice.status,
        totalAmount: invoice.totalAmount.toNumber()
      }, userId, tenantId)

      return voidedInvoice
    })
  }

  /**
   * Get invoice list with filtering and pagination
   */
  static async getInvoices(
    tenantId: string,
    options: {
      status?: string
      customerId?: string
      fromDate?: Date
      toDate?: Date
      page?: number
      limit?: number
    } = {}
  ) {
    const { status, customerId, fromDate, toDate, page = 1, limit = 50 } = options

    const whereClause: any = { tenantId }

    if (status) whereClause.status = status
    if (customerId) whereClause.customerId = customerId
    if (fromDate || toDate) {
      whereClause.invoiceDate = {}
      if (fromDate) whereClause.invoiceDate.gte = fromDate
      if (toDate) whereClause.invoiceDate.lte = toDate
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          lineItems: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                }
              }
            }
          }
        },
        orderBy: {
          invoiceDate: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invoice.count({ where: whereClause })
    ])

    return {
      invoices,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  }
}