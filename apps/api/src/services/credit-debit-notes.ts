import { prisma } from '@accounts/database'
import { Prisma } from '@prisma/client'

interface NoteLineItem {
  inventoryItemId?: string
  description: string
  hsnCode?: string
  quantity: number
  unitPrice: number
  taxRateId?: string
}

interface CreateCreditNoteInput {
  customerId: string
  originalInvoiceId?: string
  issueDate: Date
  reason?: string
  notes?: string
  lineItems: NoteLineItem[]
}

interface CreateDebitNoteInput {
  customerId: string
  originalInvoiceId?: string
  issueDate: Date
  reason?: string
  notes?: string
  lineItems: NoteLineItem[]
}

interface NotesFilter {
  status?: string
  customerId?: string
  fromDate?: Date
  toDate?: Date
  type?: 'credit' | 'debit'
  page?: number
  limit?: number
}

export class CreditDebitNoteService {
  // Generate note number
  private static async generateCreditNoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.creditNote.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    })
    return `CN-${year}-${String(count + 1).padStart(3, '0')}`
  }

  private static async generateDebitNoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.debitNote.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`)
        }
      }
    })
    return `DN-${year}-${String(count + 1).padStart(3, '0')}`
  }

  // Calculate totals for line items
  private static async calculateLineTotals(
    lineItems: NoteLineItem[],
    tenantId: string
  ): Promise<{ lineItemsWithTotals: any[], subtotal: number, taxAmount: number, totalAmount: number }> {
    const lineItemsWithTotals = []
    let subtotal = 0
    let taxAmount = 0

    for (const item of lineItems) {
      const amount = Number(item.quantity) * Number(item.unitPrice)
      let itemTaxAmount = 0

      // Calculate tax if taxRateId is provided
      if (item.taxRateId) {
        const taxRate = await prisma.taxRate.findUnique({
          where: { id: item.taxRateId }
        })

        if (taxRate) {
          // Calculate GST (using total rate which is CGST + SGST or IGST)
          const totalTaxRate = Number(taxRate.cgst) + Number(taxRate.sgst) + Number(taxRate.igst)
          itemTaxAmount = (amount * totalTaxRate) / 100
        }
      }

      const lineTotal = amount + itemTaxAmount

      lineItemsWithTotals.push({
        ...item,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        lineTotal: new Prisma.Decimal(lineTotal)
      })

      subtotal += amount
      taxAmount += itemTaxAmount
    }

    return {
      lineItemsWithTotals,
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount
    }
  }

  // Create Credit Note
  static async createCreditNote(
    tenantId: string,
    userId: string,
    data: CreateCreditNoteInput
  ) {
    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        tenantId
      }
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Calculate totals
    const { lineItemsWithTotals, subtotal, taxAmount, totalAmount } =
      await this.calculateLineTotals(data.lineItems, tenantId)

    // Generate credit note number
    const creditNoteNumber = await this.generateCreditNoteNumber(tenantId)

    // Create credit note with line items
    const creditNote = await prisma.creditNote.create({
      data: {
        tenantId,
        creditNoteNumber,
        customerId: data.customerId,
        originalInvoiceId: data.originalInvoiceId,
        issueDate: data.issueDate,
        reason: data.reason,
        notes: data.notes,
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        lineItems: {
          create: lineItemsWithTotals
        }
      },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })

    return creditNote
  }

  // Create Debit Note
  static async createDebitNote(
    tenantId: string,
    userId: string,
    data: CreateDebitNoteInput
  ) {
    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        tenantId
      }
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Calculate totals
    const { lineItemsWithTotals, subtotal, taxAmount, totalAmount } =
      await this.calculateLineTotals(data.lineItems, tenantId)

    // Generate debit note number
    const debitNoteNumber = await this.generateDebitNoteNumber(tenantId)

    // Create debit note with line items
    const debitNote = await prisma.debitNote.create({
      data: {
        tenantId,
        debitNoteNumber,
        customerId: data.customerId,
        originalInvoiceId: data.originalInvoiceId,
        issueDate: data.issueDate,
        reason: data.reason,
        notes: data.notes,
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: 'DRAFT',
        lineItems: {
          create: lineItemsWithTotals
        }
      },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })

    return debitNote
  }

  // Get all notes (credit and debit combined)
  static async getNotes(tenantId: string, filters: NotesFilter = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    // Build where clause
    const baseWhere: any = {
      tenantId
    }

    if (filters.customerId) {
      baseWhere.customerId = filters.customerId
    }

    if (filters.fromDate || filters.toDate) {
      baseWhere.issueDate = {}
      if (filters.fromDate) baseWhere.issueDate.gte = filters.fromDate
      if (filters.toDate) baseWhere.issueDate.lte = filters.toDate
    }

    if (filters.status) {
      baseWhere.status = filters.status
    }

    // Fetch both credit and debit notes
    const fetchCreditNotes = !filters.type || filters.type === 'credit'
    const fetchDebitNotes = !filters.type || filters.type === 'debit'

    const [creditNotes, debitNotes, creditCount, debitCount] = await Promise.all([
      fetchCreditNotes ? prisma.creditNote.findMany({
        where: baseWhere,
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true,
              taxRate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }) : [],
      fetchDebitNotes ? prisma.debitNote.findMany({
        where: baseWhere,
        include: {
          customer: true,
          lineItems: {
            include: {
              inventoryItem: true,
              taxRate: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }) : [],
      fetchCreditNotes ? prisma.creditNote.count({ where: baseWhere }) : 0,
      fetchDebitNotes ? prisma.debitNote.count({ where: baseWhere }) : 0
    ])

    // Combine and format results
    const formattedCreditNotes = creditNotes.map(note => ({
      ...note,
      type: 'credit' as const,
      noteNumber: note.creditNoteNumber,
      noteDate: note.issueDate
    }))

    const formattedDebitNotes = debitNotes.map(note => ({
      ...note,
      type: 'debit' as const,
      noteNumber: note.debitNoteNumber,
      noteDate: note.issueDate
    }))

    const allNotes = [...formattedCreditNotes, ...formattedDebitNotes]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return {
      notes: allNotes,
      pagination: {
        total: creditCount + debitCount,
        page,
        limit,
        totalPages: Math.ceil((creditCount + debitCount) / limit)
      }
    }
  }

  // Get single credit note
  static async getCreditNote(tenantId: string, id: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })

    if (!creditNote) {
      throw new Error('Credit note not found')
    }

    return {
      ...creditNote,
      type: 'credit' as const,
      noteNumber: creditNote.creditNoteNumber,
      noteDate: creditNote.issueDate
    }
  }

  // Get single debit note
  static async getDebitNote(tenantId: string, id: string) {
    const debitNote = await prisma.debitNote.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })

    if (!debitNote) {
      throw new Error('Debit note not found')
    }

    return {
      ...debitNote,
      type: 'debit' as const,
      noteNumber: debitNote.debitNoteNumber,
      noteDate: debitNote.issueDate
    }
  }

  // Issue credit note (change status from DRAFT to ISSUED)
  static async issueCreditNote(tenantId: string, id: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, tenantId }
    })

    if (!creditNote) {
      throw new Error('Credit note not found')
    }

    if (creditNote.status !== 'DRAFT') {
      throw new Error('Only draft credit notes can be issued')
    }

    return await prisma.creditNote.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })
  }

  // Issue debit note
  static async issueDebitNote(tenantId: string, id: string) {
    const debitNote = await prisma.debitNote.findFirst({
      where: { id, tenantId }
    })

    if (!debitNote) {
      throw new Error('Debit note not found')
    }

    if (debitNote.status !== 'DRAFT') {
      throw new Error('Only draft debit notes can be issued')
    }

    return await prisma.debitNote.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })
  }

  // Cancel credit note
  static async cancelCreditNote(tenantId: string, id: string) {
    const creditNote = await prisma.creditNote.findFirst({
      where: { id, tenantId }
    })

    if (!creditNote) {
      throw new Error('Credit note not found')
    }

    if (creditNote.status === 'APPLIED') {
      throw new Error('Cannot cancel an applied credit note')
    }

    return await prisma.creditNote.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })
  }

  // Cancel debit note
  static async cancelDebitNote(tenantId: string, id: string) {
    const debitNote = await prisma.debitNote.findFirst({
      where: { id, tenantId }
    })

    if (!debitNote) {
      throw new Error('Debit note not found')
    }

    if (debitNote.status === 'APPLIED') {
      throw new Error('Cannot cancel an applied debit note')
    }

    return await prisma.debitNote.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        customer: true,
        lineItems: {
          include: {
            inventoryItem: true,
            taxRate: true
          }
        }
      }
    })
  }
}
