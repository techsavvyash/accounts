import {
  GSTInvoice,
  GSTR1Return,
  GSTR3BReturn,
  GSTR1B2BEntry,
  GSTR1B2CLEntry,
  GSTR1B2CSEntry,
  GSTR1ExportEntry,
  GSTR1HSNEntry,
  GSTTransactionType,
  GSTInvoiceType,
  ReturnGenerationError
} from './types'
import { GSTUtils } from './validation'
import { GSTCalculator } from './calculator'

/**
 * GST Return Generator for GSTR-1 and GSTR-3B
 */
export class GSTReturnGenerator {
  /**
   * Generates GSTR-1 return from invoice data
   */
  static generateGSTR1(
    gstin: string,
    period: string,
    invoices: GSTInvoice[]
  ): GSTR1Return {
    try {
      if (!GSTUtils.isValidReturnPeriod(period)) {
        throw new ReturnGenerationError('Invalid return period format. Use MMYYYY')
      }

      const gstr1: GSTR1Return = {
        gstin,
        ret_period: period,
        b2b: [],
        b2cl: [],
        b2cs: [],
        exp: [],
        cdnr: [],
        cdnur: [],
        nil: { inv: [] },
        hsn: []
      }

      // Categorize invoices by transaction type
      for (const invoice of invoices) {
        switch (invoice.transactionType) {
          case GSTTransactionType.B2B:
            this.addToB2B(gstr1, invoice)
            break
          case GSTTransactionType.B2CL:
            this.addToB2CL(gstr1, invoice)
            break
          case GSTTransactionType.B2C:
            this.addToB2CS(gstr1, invoice)
            break
          case GSTTransactionType.EXPORT:
            this.addToExport(gstr1, invoice)
            break
          // Handle other transaction types as needed
        }
      }

      // Generate HSN summary
      gstr1.hsn = this.generateHSNSummary(invoices)

      return gstr1
    } catch (error) {
      if (error instanceof ReturnGenerationError) {
        throw error
      }
      throw new ReturnGenerationError('Failed to generate GSTR-1 return', { error })
    }
  }

  /**
   * Adds B2B transaction to GSTR-1
   */
  private static addToB2B(gstr1: GSTR1Return, invoice: GSTInvoice): void {
    if (!invoice.customerGSTIN) {
      throw new ReturnGenerationError('Customer GSTIN required for B2B transaction')
    }

    const calculation = GSTCalculator.calculateInvoiceTax(invoice)
    
    // Find existing customer entry or create new one
    let customerEntry = gstr1.b2b.find(entry => entry.ctin === invoice.customerGSTIN)
    if (!customerEntry) {
      customerEntry = {
        ctin: invoice.customerGSTIN,
        inv: []
      }
      gstr1.b2b.push(customerEntry)
    }

    // Create invoice entry
    const invoiceEntry = {
      inum: invoice.invoiceNumber,
      idt: GSTUtils.formatGSTDate(invoice.invoiceDate),
      val: calculation.totals.totalInvoiceAmount,
      pos: invoice.placeOfSupply,
      rchrg: invoice.reverseCharge ? 'Y' as const : 'N' as const,
      etin: invoice.ecommerceGSTIN,
      itms: invoice.lineItems.map((item, index) => {
        const itemCalc = calculation.lineItemCalculations[index]
        return {
          num: item.serialNo,
          itm_det: {
            csamt: itemCalc.cess,
            rt: item.gstRate,
            txval: itemCalc.taxableAmount,
            camt: itemCalc.cgst,
            samt: itemCalc.sgst,
            iamt: itemCalc.igst
          }
        }
      })
    }

    customerEntry.inv.push(invoiceEntry)
  }

  /**
   * Adds B2CL (Business to Consumer Large) transaction to GSTR-1
   */
  private static addToB2CL(gstr1: GSTR1Return, invoice: GSTInvoice): void {
    const calculation = GSTCalculator.calculateInvoiceTax(invoice)

    // Find existing place of supply entry or create new one
    let posEntry = gstr1.b2cl.find(entry => entry.pos === invoice.placeOfSupply)
    if (!posEntry) {
      posEntry = {
        pos: invoice.placeOfSupply,
        inv: []
      }
      gstr1.b2cl.push(posEntry)
    }

    const invoiceEntry = {
      inum: invoice.invoiceNumber,
      idt: GSTUtils.formatGSTDate(invoice.invoiceDate),
      val: calculation.totals.totalInvoiceAmount,
      itms: invoice.lineItems.map((item, index) => {
        const itemCalc = calculation.lineItemCalculations[index]
        return {
          num: item.serialNo,
          itm_det: {
            csamt: itemCalc.cess,
            rt: item.gstRate,
            txval: itemCalc.taxableAmount,
            iamt: itemCalc.igst // Only IGST for inter-state B2CL
          }
        }
      })
    }

    posEntry.inv.push(invoiceEntry)
  }

  /**
   * Adds B2CS (Business to Consumer Small) transaction to GSTR-1
   */
  private static addToB2CS(gstr1: GSTR1Return, invoice: GSTInvoice): void {
    const calculation = GSTCalculator.calculateInvoiceTax(invoice)
    const isInterState = !GSTUtils.isIntraState(invoice.supplierState, invoice.customerState)

    // Group by place of supply and tax rate
    for (const [index, item] of invoice.lineItems.entries()) {
      const itemCalc = calculation.lineItemCalculations[index]
      
      let b2csEntry = gstr1.b2cs.find(
        entry => 
          entry.pos === invoice.placeOfSupply &&
          entry.rt === item.gstRate &&
          entry.sply_ty === (isInterState ? 'INTER' : 'INTRA')
      )

      if (!b2csEntry) {
        b2csEntry = {
          sply_ty: isInterState ? 'INTER' : 'INTRA',
          pos: invoice.placeOfSupply,
          typ: 'OE', // Other than exempted
          rt: item.gstRate,
          txval: 0,
          iamt: 0,
          csamt: 0
        }
        gstr1.b2cs.push(b2csEntry)
      }

      // Aggregate values
      b2csEntry.txval += itemCalc.taxableAmount
      b2csEntry.iamt += itemCalc.igst
      b2csEntry.csamt += itemCalc.cess
    }
  }

  /**
   * Adds Export transaction to GSTR-1
   */
  private static addToExport(gstr1: GSTR1Return, invoice: GSTInvoice): void {
    const calculation = GSTCalculator.calculateInvoiceTax(invoice)

    let exportEntry = gstr1.exp.find(entry => entry.exp_typ === 'WPAY') // Assuming with payment
    if (!exportEntry) {
      exportEntry = {
        exp_typ: 'WPAY',
        inv: []
      }
      gstr1.exp.push(exportEntry)
    }

    const invoiceEntry = {
      inum: invoice.invoiceNumber,
      idt: GSTUtils.formatGSTDate(invoice.invoiceDate),
      val: calculation.totals.totalInvoiceAmount,
      sbpcode: '000000', // Default shipping bill port code
      sbnum: '000000', // Default shipping bill number
      sbdt: GSTUtils.formatGSTDate(invoice.invoiceDate), // Default to invoice date
      itms: invoice.lineItems.map((item, index) => {
        const itemCalc = calculation.lineItemCalculations[index]
        return {
          num: item.serialNo,
          itm_det: {
            csamt: itemCalc.cess,
            rt: item.gstRate,
            txval: itemCalc.taxableAmount
          }
        }
      })
    }

    exportEntry.inv.push(invoiceEntry)
  }

  /**
   * Generates HSN summary for GSTR-1
   */
  private static generateHSNSummary(invoices: GSTInvoice[]): GSTR1HSNEntry[] {
    const hsnMap = new Map<string, GSTR1HSNEntry>()

    let serialNumber = 1

    for (const invoice of invoices) {
      const calculation = GSTCalculator.calculateInvoiceTax(invoice)

      for (const [index, item] of invoice.lineItems.entries()) {
        const hsnSac = item.hsnSac || '000000'
        const itemCalc = calculation.lineItemCalculations[index]

        let hsnEntry = hsnMap.get(hsnSac)
        if (!hsnEntry) {
          hsnEntry = {
            num: serialNumber++,
            hsn_sc: hsnSac,
            desc: item.description.substring(0, 30), // Truncate description
            uqc: item.unit.toUpperCase(),
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          }
          hsnMap.set(hsnSac, hsnEntry)
        }

        // Aggregate values
        hsnEntry.qty += item.quantity
        hsnEntry.val += itemCalc.totalAmount
        hsnEntry.txval += itemCalc.taxableAmount
        hsnEntry.iamt += itemCalc.igst
        hsnEntry.camt += itemCalc.cgst
        hsnEntry.samt += itemCalc.sgst
        hsnEntry.csamt += itemCalc.cess
      }
    }

    // Format amounts and return as array
    return Array.from(hsnMap.values()).map(entry => ({
      ...entry,
      val: GSTUtils.formatAmount(entry.val),
      txval: GSTUtils.formatAmount(entry.txval),
      iamt: GSTUtils.formatAmount(entry.iamt),
      camt: GSTUtils.formatAmount(entry.camt),
      samt: GSTUtils.formatAmount(entry.samt),
      csamt: GSTUtils.formatAmount(entry.csamt)
    }))
  }

  /**
   * Generates GSTR-3B return from transaction data
   */
  static generateGSTR3B(
    gstin: string,
    period: string,
    outwardSupplies: {
      taxable: number
      igst: number
      cgst: number
      sgst: number
      cess: number
    },
    inwardSupplies: {
      reverseCharge: {
        taxable: number
        igst: number
        cgst: number
        sgst: number
        cess: number
      }
    },
    itcData: {
      available: {
        igst: number
        cgst: number
        sgst: number
        cess: number
      }
      reversed: {
        igst: number
        cgst: number
        sgst: number
        cess: number
      }
    }
  ): GSTR3BReturn {
    try {
      if (!GSTUtils.isValidReturnPeriod(period)) {
        throw new ReturnGenerationError('Invalid return period format. Use MMYYYY')
      }

      return {
        gstin,
        ret_period: period,
        sup_details: {
          osup_det: {
            txval: GSTUtils.formatAmount(outwardSupplies.taxable),
            iamt: GSTUtils.formatAmount(outwardSupplies.igst),
            camt: GSTUtils.formatAmount(outwardSupplies.cgst),
            samt: GSTUtils.formatAmount(outwardSupplies.sgst),
            csamt: GSTUtils.formatAmount(outwardSupplies.cess)
          },
          osup_zero: {
            txval: 0,
            iamt: 0,
            csamt: 0
          },
          osup_nil_exmp: {
            txval: 0
          },
          isup_rev: {
            txval: GSTUtils.formatAmount(inwardSupplies.reverseCharge.taxable),
            iamt: GSTUtils.formatAmount(inwardSupplies.reverseCharge.igst),
            camt: GSTUtils.formatAmount(inwardSupplies.reverseCharge.cgst),
            samt: GSTUtils.formatAmount(inwardSupplies.reverseCharge.sgst),
            csamt: GSTUtils.formatAmount(inwardSupplies.reverseCharge.cess)
          },
          osup_nongst: {
            txval: 0
          }
        },
        inter_sup: {
          unreg_details: [],
          comp_details: [],
          uin_details: []
        },
        itc_elg: {
          itc_avl: [{
            ty: 'ISRC',
            iamt: GSTUtils.formatAmount(itcData.available.igst),
            camt: GSTUtils.formatAmount(itcData.available.cgst),
            samt: GSTUtils.formatAmount(itcData.available.sgst),
            csamt: GSTUtils.formatAmount(itcData.available.cess)
          }],
          itc_rev: [{
            ty: 'RUL',
            iamt: GSTUtils.formatAmount(itcData.reversed.igst),
            camt: GSTUtils.formatAmount(itcData.reversed.cgst),
            samt: GSTUtils.formatAmount(itcData.reversed.sgst),
            csamt: GSTUtils.formatAmount(itcData.reversed.cess)
          }],
          itc_net: {
            iamt: GSTUtils.formatAmount(itcData.available.igst - itcData.reversed.igst),
            camt: GSTUtils.formatAmount(itcData.available.cgst - itcData.reversed.cgst),
            samt: GSTUtils.formatAmount(itcData.available.sgst - itcData.reversed.sgst),
            csamt: GSTUtils.formatAmount(itcData.available.cess - itcData.reversed.cess)
          },
          itc_inelg: []
        },
        inward_sup: {
          isup_details: []
        }
      }
    } catch (error) {
      if (error instanceof ReturnGenerationError) {
        throw error
      }
      throw new ReturnGenerationError('Failed to generate GSTR-3B return', { error })
    }
  }

  /**
   * Validates GSTR-1 return data
   */
  static validateGSTR1(gstr1: GSTR1Return): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Basic validations
    if (!gstr1.gstin || gstr1.gstin.length !== 15) {
      errors.push('Invalid GSTIN format')
    }

    if (!GSTUtils.isValidReturnPeriod(gstr1.ret_period)) {
      errors.push('Invalid return period format')
    }

    // Validate B2B entries
    for (const b2bEntry of gstr1.b2b) {
      if (!b2bEntry.ctin || b2bEntry.ctin.length !== 15) {
        errors.push(`Invalid customer GSTIN in B2B: ${b2bEntry.ctin}`)
      }

      for (const invoice of b2bEntry.inv) {
        if (!invoice.inum || invoice.inum.trim().length === 0) {
          errors.push('Missing invoice number in B2B entry')
        }

        if (invoice.itms.length === 0) {
          errors.push(`No line items in invoice: ${invoice.inum}`)
        }
      }
    }

    // Validate HSN entries
    for (const hsnEntry of gstr1.hsn) {
      if (!hsnEntry.hsn_sc || hsnEntry.hsn_sc.length < 2) {
        errors.push(`Invalid HSN code: ${hsnEntry.hsn_sc}`)
      }

      if (hsnEntry.qty <= 0) {
        errors.push(`Invalid quantity for HSN ${hsnEntry.hsn_sc}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validates GSTR-3B return data
   */
  static validateGSTR3B(gstr3b: GSTR3BReturn): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!gstr3b.gstin || gstr3b.gstin.length !== 15) {
      errors.push('Invalid GSTIN format')
    }

    if (!GSTUtils.isValidReturnPeriod(gstr3b.ret_period)) {
      errors.push('Invalid return period format')
    }

    // Validate that ITC net amounts are correctly calculated
    const expectedIGST = (gstr3b.itc_elg.itc_avl[0]?.iamt || 0) - (gstr3b.itc_elg.itc_rev[0]?.iamt || 0)
    const expectedCGST = (gstr3b.itc_elg.itc_avl[0]?.camt || 0) - (gstr3b.itc_elg.itc_rev[0]?.camt || 0)
    const expectedSGST = (gstr3b.itc_elg.itc_avl[0]?.samt || 0) - (gstr3b.itc_elg.itc_rev[0]?.samt || 0)

    if (Math.abs(gstr3b.itc_elg.itc_net.iamt - expectedIGST) > 0.01) {
      errors.push('ITC net IGST calculation mismatch')
    }

    if (Math.abs(gstr3b.itc_elg.itc_net.camt - expectedCGST) > 0.01) {
      errors.push('ITC net CGST calculation mismatch')
    }

    if (Math.abs(gstr3b.itc_elg.itc_net.samt - expectedSGST) > 0.01) {
      errors.push('ITC net SGST calculation mismatch')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Exports GSTR-1 return as JSON
   */
  static exportGSTR1JSON(gstr1: GSTR1Return): string {
    try {
      return JSON.stringify(gstr1, null, 2)
    } catch (error) {
      throw new ReturnGenerationError('Failed to export GSTR-1 as JSON', { error })
    }
  }

  /**
   * Exports GSTR-3B return as JSON
   */
  static exportGSTR3BJSON(gstr3b: GSTR3BReturn): string {
    try {
      return JSON.stringify(gstr3b, null, 2)
    } catch (error) {
      throw new ReturnGenerationError('Failed to export GSTR-3B as JSON', { error })
    }
  }
}