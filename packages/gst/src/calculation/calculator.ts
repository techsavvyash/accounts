import {
  TaxCalculationInput,
  TaxBreakdown,
  TaxCalculationError,
  GSTInvoice,
  GSTInvoiceLineItem,
  GST_RATES
} from '../core'
import { GSTUtils } from '../validation'
import { HSNRegistry } from '../hsn'

/**
 * GST Tax Calculator for Indian tax calculations
 */
export class GSTCalculator {
  /**
   * Calculates GST breakdown for a given amount and rate
   */
  static calculateTax(input: TaxCalculationInput): TaxBreakdown {
    try {
      const {
        amount,
        gstRate,
        isInclusive = false,
        applyReverseCharge = false,
        isInterState = false,
        cessRate = 0
      } = input

      if (amount <= 0) {
        throw new TaxCalculationError('Amount must be positive')
      }

      if (gstRate < 0 || gstRate > 50) {
        throw new TaxCalculationError('GST rate must be between 0 and 50')
      }

      if (cessRate < 0) {
        throw new TaxCalculationError('Cess rate cannot be negative')
      }

      let taxableAmount: number
      let totalTax: number
      let totalAmount: number

      if (isInclusive) {
        // Amount includes GST - extract taxable amount
        totalAmount = amount
        const divisor = 1 + (gstRate / 100) + (cessRate / 100)
        taxableAmount = amount / divisor
        totalTax = amount - taxableAmount
      } else {
        // Amount is taxable - add GST
        taxableAmount = amount
        totalTax = (taxableAmount * (gstRate + cessRate)) / 100
        totalAmount = taxableAmount + totalTax
      }

      // Calculate individual tax components
      const gstAmount = (taxableAmount * gstRate) / 100
      const cessAmount = (taxableAmount * cessRate) / 100

      let cgst = 0
      let sgst = 0
      let igst = 0

      if (isInterState) {
        // Inter-state: Only IGST
        igst = gstAmount
      } else {
        // Intra-state: CGST + SGST (equal split)
        cgst = gstAmount / 2
        sgst = gstAmount / 2
      }

      // Handle reverse charge (tax responsibility shifts to buyer)
      if (applyReverseCharge) {
        // In reverse charge, supplier doesn't charge tax
        // This is mainly for documentation - actual tax still calculated
      }

      return {
        taxableAmount: GSTUtils.formatAmount(taxableAmount),
        cgst: GSTUtils.formatAmount(cgst),
        sgst: GSTUtils.formatAmount(sgst),
        igst: GSTUtils.formatAmount(igst),
        cess: GSTUtils.formatAmount(cessAmount),
        totalTax: GSTUtils.formatAmount(totalTax),
        totalAmount: GSTUtils.formatAmount(totalAmount),
        gstRate,
        isInterState,
        isInclusive
      }
    } catch (error) {
      if (error instanceof TaxCalculationError) {
        throw error
      }
      throw new TaxCalculationError('Tax calculation failed', { error })
    }
  }

  /**
   * Calculates GST for an invoice line item
   */
  static calculateLineItemTax(
    lineItem: GSTInvoiceLineItem,
    supplierState: string,
    customerState: string,
    applyReverseCharge: boolean = false
  ): TaxBreakdown & { lineTotal: number } {
    const { quantity, unitPrice, discount = 0, gstRate, cessRate = 0 } = lineItem

    // Calculate line total before tax
    const grossAmount = quantity * unitPrice
    const discountAmount = (grossAmount * discount) / 100
    const lineTotal = grossAmount - discountAmount

    const isInterState = !GSTUtils.isIntraState(supplierState, customerState)

    const taxBreakdown = this.calculateTax({
      amount: lineTotal,
      gstRate,
      isInclusive: false,
      applyReverseCharge,
      isInterState,
      cessRate
    })

    return {
      ...taxBreakdown,
      lineTotal: GSTUtils.formatAmount(lineTotal)
    }
  }

  /**
   * Calculates total GST for an entire invoice
   */
  static calculateInvoiceTax(invoice: GSTInvoice): {
    lineItemCalculations: Array<TaxBreakdown & { lineTotal: number }>
    totals: {
      totalTaxableAmount: number
      totalCGST: number
      totalSGST: number
      totalIGST: number
      totalCess: number
      totalTax: number
      totalInvoiceAmount: number
    }
  } {
    const { supplierState, customerState, reverseCharge, lineItems } = invoice

    const lineItemCalculations = lineItems.map(lineItem =>
      this.calculateLineItemTax(lineItem, supplierState, customerState, reverseCharge)
    )

    // Aggregate totals
    const totals = lineItemCalculations.reduce(
      (acc, calc) => ({
        totalTaxableAmount: acc.totalTaxableAmount + calc.taxableAmount,
        totalCGST: acc.totalCGST + calc.cgst,
        totalSGST: acc.totalSGST + calc.sgst,
        totalIGST: acc.totalIGST + calc.igst,
        totalCess: acc.totalCess + calc.cess,
        totalTax: acc.totalTax + calc.totalTax,
        totalInvoiceAmount: acc.totalInvoiceAmount + calc.totalAmount
      }),
      {
        totalTaxableAmount: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
        totalCess: 0,
        totalTax: 0,
        totalInvoiceAmount: 0
      }
    )

    // Format final amounts
    Object.keys(totals).forEach(key => {
      totals[key as keyof typeof totals] = GSTUtils.formatAmount(totals[key as keyof typeof totals])
    })

    return { lineItemCalculations, totals }
  }

  /**
   * Calculates reverse GST amount (removing GST from inclusive amount)
   */
  static calculateReverseGST(inclusiveAmount: number, gstRate: number): {
    taxableAmount: number
    gstAmount: number
  } {
    if (inclusiveAmount <= 0) {
      throw new TaxCalculationError('Amount must be positive')
    }

    if (gstRate < 0 || gstRate > 50) {
      throw new TaxCalculationError('GST rate must be between 0 and 50')
    }

    const divisor = 1 + (gstRate / 100)
    const taxableAmount = inclusiveAmount / divisor
    const gstAmount = inclusiveAmount - taxableAmount

    return {
      taxableAmount: GSTUtils.formatAmount(taxableAmount),
      gstAmount: GSTUtils.formatAmount(gstAmount)
    }
  }

  /**
   * Determines applicable GST rate based on HSN/SAC code and amount
   * Uses the comprehensive HSN Registry for accurate rate determination
   */
  static getApplicableGSTRate(hsnSac?: string, amount?: number): number {
    if (!hsnSac) {
      return GST_RATES.GST_18 // Default rate
    }

    // Try to get rate from HSN Registry
    const recommendedRate = HSNRegistry.getRecommendedGSTRate(hsnSac)
    if (recommendedRate !== undefined) {
      return recommendedRate
    }

    // Fallback to simplified chapter-based logic
    const code = hsnSac.substring(0, 2)

    // Essential items (food, medicines, etc.)
    if (['01', '02', '03', '04', '07', '08', '10'].includes(code)) {
      return GST_RATES.EXEMPT // 0% or 5%
    }

    // Textiles, processed foods
    if (['11', '15', '17', '19', '20', '21'].includes(code)) {
      return GST_RATES.GST_5
    }

    // Industrial inputs
    if (['25', '27', '28', '29', '30'].includes(code)) {
      return GST_RATES.GST_12
    }

    // Most goods and services
    if (['84', '85', '87', '90'].includes(code)) {
      return GST_RATES.GST_18
    }

    // Luxury items, automobiles, tobacco
    if (['22', '24', '33', '34'].includes(code)) {
      return GST_RATES.GST_28
    }

    // Services (SAC codes) - most are 18%
    if (hsnSac.length === 6 && /^[0-9]+$/.test(hsnSac)) {
      return GST_RATES.GST_18
    }

    return GST_RATES.GST_18 // Default rate
  }

  /**
   * Calculates composite GST rate for mixed supplies
   */
  static calculateCompositeRate(
    supplies: Array<{ amount: number; gstRate: number }>
  ): number {
    if (supplies.length === 0) {
      throw new TaxCalculationError('No supplies provided')
    }

    const totalAmount = supplies.reduce((sum, supply) => sum + supply.amount, 0)
    
    if (totalAmount <= 0) {
      throw new TaxCalculationError('Total amount must be positive')
    }

    const weightedTax = supplies.reduce(
      (sum, supply) => sum + (supply.amount * supply.gstRate),
      0
    )

    return GSTUtils.formatAmount(weightedTax / totalAmount)
  }

  /**
   * Calculates TDS on GST (Tax Deducted at Source)
   * Applicable for certain categories of suppliers
   */
  static calculateTDSOnGST(
    taxableAmount: number,
    gstRate: number,
    tdsRate: number = 2 // Default TDS rate of 2% on GST amount
  ): {
    gstAmount: number
    tdsAmount: number
    netPayable: number
  } {
    if (taxableAmount <= 0) {
      throw new TaxCalculationError('Taxable amount must be positive')
    }

    const gstAmount = (taxableAmount * gstRate) / 100
    const tdsAmount = (gstAmount * tdsRate) / 100
    const netPayable = taxableAmount + gstAmount - tdsAmount

    return {
      gstAmount: GSTUtils.formatAmount(gstAmount),
      tdsAmount: GSTUtils.formatAmount(tdsAmount),
      netPayable: GSTUtils.formatAmount(netPayable)
    }
  }
}

/**
 * Utility class for GST rate management and lookups
 */
export class GSTRateManager {
  private static customRates: Map<string, number> = new Map()

  /**
   * Sets custom GST rate for specific HSN/SAC codes
   */
  static setCustomRate(hsnSac: string, rate: number): void {
    if (rate < 0 || rate > 50) {
      throw new TaxCalculationError('GST rate must be between 0 and 50')
    }
    this.customRates.set(hsnSac.toLowerCase(), rate)
  }

  /**
   * Gets GST rate for HSN/SAC code (custom or standard)
   */
  static getRate(hsnSac: string): number {
    const customRate = this.customRates.get(hsnSac.toLowerCase())
    if (customRate !== undefined) {
      return customRate
    }
    return GSTCalculator.getApplicableGSTRate(hsnSac)
  }

  /**
   * Clears all custom rates
   */
  static clearCustomRates(): void {
    this.customRates.clear()
  }

  /**
   * Gets all available GST rates
   */
  static getAllStandardRates(): typeof GST_RATES {
    return GST_RATES
  }
}