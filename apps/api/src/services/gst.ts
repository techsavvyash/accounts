import { prisma } from '@accounts/database'
import { GST, GSTInvoice, GSTR1Return, GSTR3BReturn, GSTTransactionType } from '@accounts/gst'
import { trackEvent } from '../middleware/posthog'

export class GSTService {
  /**
   * Calculate GST for a transaction
   */
  static calculateGST(
    amount: number,
    gstRate: number,
    supplierState: string,
    customerState: string,
    options: {
      isInclusive?: boolean
      cessRate?: number
      applyReverseCharge?: boolean
    } = {}
  ) {
    return GST.quickCalculate(amount, gstRate, supplierState, customerState, options)
  }

  /**
   * Validate GSTIN
   */
  static validateGSTIN(gstin: string) {
    try {
      GST.validateGSTIN(gstin)
      return {
        isValid: true,
        info: GST.extractGSTINInfo(gstin)
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Get applicable GST rate for HSN/SAC code
   */
  static getGSTRate(hsnSac: string, amount?: number) {
    return GST.getApplicableGSTRate(hsnSac, amount)
  }

  /**
   * Generate GSTR-1 return
   */
  static async generateGSTR1(
    tenantId: string,
    userId: string,
    period: string
  ): Promise<{ return: GSTR1Return; validation: { isValid: boolean; errors: string[] } }> {
    // Get tenant's GSTIN
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true }
    })

    if (!tenant?.gstin) {
      throw new Error('Tenant GSTIN not found. Please configure GSTIN in tenant settings.')
    }

    // Get all invoices for the period
    const [year, month] = period.split('-')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SENT', 'PARTIALLY_PAID', 'PAID']
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

    // Convert database invoices to GST format
    const gstInvoices: GSTInvoice[] = invoices.map(invoice => {
      // Determine transaction type based on customer and invoice value
      let transactionType = GSTTransactionType.B2C
      if (invoice.customer.gstin) {
        transactionType = GSTTransactionType.B2B
      } else if (invoice.totalAmount.toNumber() > 250000) {
        transactionType = GSTTransactionType.B2CL
      }

      return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceType: 'Tax Invoice' as any,
        transactionType,
        placeOfSupply: invoice.customer.address?.state || tenant.address?.state || '29',
        
        supplierGSTIN: tenant.gstin,
        supplierName: tenant.businessName || tenant.name,
        supplierAddress: tenant.address?.line1 || '',
        supplierState: tenant.address?.state || '29',
        
        customerGSTIN: invoice.customer.gstin || undefined,
        customerName: invoice.customer.name,
        customerAddress: invoice.customer.address?.line1 || '',
        customerState: invoice.customer.address?.state || '29',
        
        lineItems: invoice.lineItems.map((item, index) => ({
          serialNo: index + 1,
          description: item.description,
          hsnSac: item.inventoryItem?.hsnCode || undefined,
          quantity: item.quantity.toNumber(),
          unit: item.inventoryItem?.unitType || 'PCS',
          unitPrice: item.unitPrice.toNumber(),
          discount: 0,
          gstRate: item.taxRate?.igst.toNumber() || 18,
          cessRate: 0,
          isService: !item.inventoryItem
        })),
        
        reverseCharge: false,
        notes: invoice.notes || undefined
      }
    })

    // Generate GSTR-1
    const gstr1Return = GST.generateGSTR1(tenant.gstin, period.replace('-', ''), gstInvoices)
    const validation = GST.validateGSTR1(gstr1Return)

    // Track event
    trackEvent('gst.gstr1_generated', {
      period,
      invoiceCount: invoices.length,
      totalValue: invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0)
    }, userId, tenantId)

    return {
      return: gstr1Return,
      validation
    }
  }

  /**
   * Generate GSTR-3B return
   */
  static async generateGSTR3B(
    tenantId: string,
    userId: string,
    period: string
  ): Promise<{ return: GSTR3BReturn; validation: { isValid: boolean; errors: string[] } }> {
    // Get tenant's GSTIN
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true }
    })

    if (!tenant?.gstin) {
      throw new Error('Tenant GSTIN not found. Please configure GSTIN in tenant settings.')
    }

    // Get period data
    const [year, month] = period.split('-')
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)

    // Calculate outward supplies
    const outwardSupplies = await this.calculateOutwardSupplies(tenantId, startDate, endDate)
    
    // Calculate inward supplies (simplified - would need purchase data)
    const inwardSupplies = {
      reverseCharge: {
        taxable: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      }
    }

    // Calculate ITC (simplified)
    const itcData = {
      available: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      reversed: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      }
    }

    // Generate GSTR-3B
    const gstr3bReturn = GST.generateGSTR3B(
      tenant.gstin,
      period.replace('-', ''),
      outwardSupplies,
      inwardSupplies,
      itcData
    )

    const validation = GST.validateGSTR3B(gstr3bReturn)

    // Track event
    trackEvent('gst.gstr3b_generated', {
      period,
      outwardSupplies: outwardSupplies.taxable
    }, userId, tenantId)

    return {
      return: gstr3bReturn,
      validation
    }
  }

  /**
   * Calculate outward supplies for GSTR-3B
   */
  private static async calculateOutwardSupplies(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['SENT', 'PARTIALLY_PAID', 'PAID']
        }
      },
      include: {
        customer: true,
        lineItems: {
          include: {
            taxRate: true
          }
        }
      }
    })

    let totalTaxable = 0
    let totalIGST = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalCess = 0

    for (const invoice of invoices) {
      // Simple calculation - in real implementation, you'd use proper GST calculation
      const taxableAmount = invoice.totalAmount.toNumber() - invoice.taxAmount.toNumber()
      const taxAmount = invoice.taxAmount.toNumber()

      totalTaxable += taxableAmount

      // Determine if inter-state based on customer state vs tenant state
      // For simplicity, assuming intra-state (CGST + SGST)
      totalCGST += taxAmount / 2
      totalSGST += taxAmount / 2
    }

    return {
      taxable: totalTaxable,
      igst: totalIGST,
      cgst: totalCGST,
      sgst: totalSGST,
      cess: totalCess
    }
  }

  /**
   * Export GSTR-1 as JSON
   */
  static exportGSTR1JSON(gstr1Return: GSTR1Return): string {
    return GST.exportGSTR1JSON(gstr1Return)
  }

  /**
   * Export GSTR-3B as JSON
   */
  static exportGSTR3BJSON(gstr3bReturn: GSTR3BReturn): string {
    return GST.exportGSTR3BJSON(gstr3bReturn)
  }

  /**
   * Get GST rates summary
   */
  static getGSTRates() {
    return GST.getAllStandardGSTRates()
  }

  /**
   * Calculate comprehensive GST info
   */
  static getComprehensiveGSTInfo(
    amount: number,
    hsnSac?: string,
    supplierState?: string,
    customerState?: string
  ) {
    return GST.getGSTInfo(amount, hsnSac, supplierState, customerState)
  }

  /**
   * Batch calculate GST for multiple items
   */
  static batchCalculateGST(
    items: Array<{
      amount: number
      gstRate?: number
      hsnSac?: string
      description?: string
    }>,
    supplierState: string,
    customerState: string
  ) {
    return GST.batchCalculate(items, supplierState, customerState)
  }

  /**
   * Calculate reverse GST (extract tax from inclusive amount)
   */
  static calculateReverseGST(inclusiveAmount: number, gstRate: number) {
    return GST.calculateReverseGST(inclusiveAmount, gstRate)
  }
}