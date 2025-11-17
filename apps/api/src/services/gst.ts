import { prisma } from '@accounts/database'
import {
  GST,
  GSTInvoice,
  GSTR1Return,
  GSTR3BReturn,
  GSTTransactionType,
  HSNRegistry,
  GSTPortalHelper
} from '@accounts/gst'
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

  // ==================== HSN Registry Methods ====================

  /**
   * Get all HSN chapters
   */
  static getHSNChapters() {
    return HSNRegistry.getAllChapters()
  }

  /**
   * Get specific HSN chapter by code
   */
  static getHSNChapter(code: string) {
    return HSNRegistry.getChapter(code)
  }

  /**
   * Get HSN chapters by section
   */
  static getHSNChaptersBySection(section: string) {
    return HSNRegistry.getChaptersBySection(section)
  }

  /**
   * Search HSN codes by description
   */
  static searchHSNCodes(query: string) {
    return HSNRegistry.searchByDescription(query)
  }

  /**
   * Find HSN code by exact code
   */
  static findHSNCode(code: string) {
    return HSNRegistry.findByCode(code)
  }

  /**
   * Get all HSN codes for a chapter
   */
  static getHSNCodesByChapter(chapter: string) {
    return HSNRegistry.getByChapter(chapter)
  }

  /**
   * Get all HSN codes with specific GST rate
   */
  static getHSNCodesByRate(rate: number) {
    return HSNRegistry.getByGSTRate(rate)
  }

  /**
   * Get recommended GST rate for HSN/SAC code
   */
  static getRecommendedGSTRate(code: string) {
    return HSNRegistry.getRecommendedGSTRate(code)
  }

  /**
   * Lookup detailed HSN information
   */
  static lookupHSN(code: string) {
    return HSNRegistry.lookup(code)
  }

  /**
   * Get HSN details including chapter info
   */
  static getHSNDetails(code: string) {
    return HSNRegistry.getDetails(code)
  }

  /**
   * Get all registered HSN codes
   */
  static getAllHSNCodes() {
    return HSNRegistry.getAllCodes()
  }

  /**
   * Get HSN registry statistics
   */
  static getHSNCount() {
    return HSNRegistry.getCount()
  }

  // ==================== Portal Export Methods ====================

  /**
   * Export GSTR-1 for portal upload
   */
  static exportGSTR1ForPortal(gstr1: GSTR1Return, options?: { pretty?: boolean; validate?: boolean }) {
    return GSTPortalHelper.exportGSTR1ForPortal(gstr1, options)
  }

  /**
   * Export GSTR-3B for portal upload
   */
  static exportGSTR3BForPortal(gstr3b: GSTR3BReturn, options?: { pretty?: boolean; validate?: boolean }) {
    return GSTPortalHelper.exportGSTR3BForPortal(gstr3b, options)
  }

  /**
   * Generate complete portal package (GSTR-1 + GSTR-3B)
   */
  static generatePortalPackage(gstr1: GSTR1Return, gstr3b: GSTR3BReturn) {
    return GSTPortalHelper.generatePortalPackage(gstr1, gstr3b)
  }

  /**
   * Get portal upload instructions
   */
  static getPortalUploadInstructions(returnType: 'GSTR-1' | 'GSTR-3B') {
    // Return structured instructions for API consumers
    const baseInstructions = [
      { step: 1, action: `Visit the GST Portal`, url: 'https://www.gst.gov.in/' },
      { step: 2, action: 'Login with your credentials' },
      { step: 3, action: `Navigate to Returns Dashboard > ${returnType}` },
      { step: 4, action: 'Select the relevant tax period' },
      { step: 5, action: 'Click on "Prepare Offline"' },
      { step: 6, action: 'Download the offline tool or use JSON upload' },
      { step: 7, action: 'Upload the generated JSON file' },
      { step: 8, action: 'Review the uploaded data' },
      { step: 9, action: 'Submit the return after verification' }
    ]

    const resources = {
      'GSTR-1': {
        portal: 'https://www.gst.gov.in/',
        offlineTool: 'https://www.gst.gov.in/download/returns',
        tutorial: 'https://tutorial.gst.gov.in/userguide/returns/index.htm',
        helpdesk: 'https://selfservice.gstsystem.in/'
      },
      'GSTR-3B': {
        portal: 'https://www.gst.gov.in/',
        offlineTool: 'https://www.gst.gov.in/download/returns',
        tutorial: 'https://tutorial.gst.gov.in/userguide/returns/gstr3b.htm',
        helpdesk: 'https://selfservice.gstsystem.in/'
      }
    }

    return {
      instructions: baseInstructions,
      resources: resources[returnType],
      notes: [
        'Ensure you have a valid Digital Signature Certificate (DSC) or EVC',
        'File the return before the due date to avoid late fees',
        'Keep backups of all generated JSON files',
        'Verify all data before final submission'
      ]
    }
  }

  /**
   * Validate file size for portal upload
   */
  static validatePortalFileSize(sizeInBytes: number) {
    return GSTPortalHelper.validateFileSize(sizeInBytes)
  }

  // ==================== Additional Validation Methods ====================

  /**
   * Validate PAN number
   */
  static validatePAN(pan: string) {
    try {
      GST.validatePAN(pan)
      return {
        isValid: true,
        info: GST.extractPANInfo(pan)
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Validate HSN code
   */
  static validateHSN(hsn: string) {
    try {
      GST.validateHSN(hsn)
      return {
        isValid: true,
        info: GST.getHSNChapterInfo(hsn)
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Validate SAC code
   */
  static validateSAC(sac: string) {
    try {
      GST.validateSAC(sac)
      return {
        isValid: true,
        info: GST.getSACCategoryInfo(sac)
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      }
    }
  }
}