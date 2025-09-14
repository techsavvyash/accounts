// Export all types
export * from './types'

// Export validation utilities
export {
  GSTINValidator,
  PANValidator, 
  HSNValidator,
  SACValidator,
  GSTUtils
} from './validation'

// Export calculation utilities
export {
  GSTCalculator,
  GSTRateManager
} from './calculator'

// Export return generation utilities
export {
  GSTReturnGenerator
} from './returns'

// Export error classes
export {
  GSTError,
  GSTINValidationError,
  TaxCalculationError,
  ReturnGenerationError
} from './types'

// Main GST class that provides a unified interface
import { GSTINValidator, PANValidator, HSNValidator, SACValidator, GSTUtils } from './validation'
import { GSTCalculator, GSTRateManager } from './calculator' 
import { GSTReturnGenerator } from './returns'
import {
  TaxCalculationInput,
  TaxBreakdown,
  GSTInvoice,
  GSTR1Return,
  GSTR3BReturn,
  GSTError,
  GSTINValidationError,
  TaxCalculationError,
  ReturnGenerationError
} from './types'

/**
 * Main GST utility class providing a unified interface
 * for all GST-related operations
 */
export class GST {
  // Validation methods
  static validateGSTIN = GSTINValidator.validate.bind(GSTINValidator)
  static extractGSTINInfo = GSTINValidator.extract.bind(GSTINValidator)
  static generateGSTINCheckDigit = GSTINValidator.generateCheckDigit.bind(GSTINValidator)
  
  static validatePAN = PANValidator.validate.bind(PANValidator)
  static extractPANInfo = PANValidator.extract.bind(PANValidator)
  
  static validateHSN = HSNValidator.validate.bind(HSNValidator)
  static getHSNChapterInfo = HSNValidator.getChapterInfo.bind(HSNValidator)
  
  static validateSAC = SACValidator.validate.bind(SACValidator)
  static getSACCategoryInfo = SACValidator.getCategoryInfo.bind(SACValidator)
  
  // Utility methods
  static isIntraState = GSTUtils.isIntraState.bind(GSTUtils)
  static getStateName = GSTUtils.getStateName.bind(GSTUtils)
  static isValidStateCode = GSTUtils.isValidStateCode.bind(GSTUtils)
  static formatAmount = GSTUtils.formatAmount.bind(GSTUtils)
  static formatGSTDate = GSTUtils.formatGSTDate.bind(GSTUtils)
  static formatReturnPeriod = GSTUtils.formatReturnPeriod.bind(GSTUtils)
  static isValidReturnPeriod = GSTUtils.isValidReturnPeriod.bind(GSTUtils)
  
  // Calculation methods
  static calculateTax = GSTCalculator.calculateTax.bind(GSTCalculator)
  static calculateLineItemTax = GSTCalculator.calculateLineItemTax.bind(GSTCalculator)
  static calculateInvoiceTax = GSTCalculator.calculateInvoiceTax.bind(GSTCalculator)
  static calculateReverseGST = GSTCalculator.calculateReverseGST.bind(GSTCalculator)
  static getApplicableGSTRate = GSTCalculator.getApplicableGSTRate.bind(GSTCalculator)
  static calculateCompositeRate = GSTCalculator.calculateCompositeRate.bind(GSTCalculator)
  static calculateTDSOnGST = GSTCalculator.calculateTDSOnGST.bind(GSTCalculator)
  
  // Rate management methods
  static setCustomGSTRate = GSTRateManager.setCustomRate.bind(GSTRateManager)
  static getGSTRate = GSTRateManager.getRate.bind(GSTRateManager)
  static clearCustomGSTRates = GSTRateManager.clearCustomRates.bind(GSTRateManager)
  static getAllStandardGSTRates = GSTRateManager.getAllStandardRates.bind(GSTRateManager)
  
  // Return generation methods
  static generateGSTR1 = GSTReturnGenerator.generateGSTR1.bind(GSTReturnGenerator)
  static generateGSTR3B = GSTReturnGenerator.generateGSTR3B.bind(GSTReturnGenerator)
  static validateGSTR1 = GSTReturnGenerator.validateGSTR1.bind(GSTReturnGenerator)
  static validateGSTR3B = GSTReturnGenerator.validateGSTR3B.bind(GSTReturnGenerator)
  static exportGSTR1JSON = GSTReturnGenerator.exportGSTR1JSON.bind(GSTReturnGenerator)
  static exportGSTR3BJSON = GSTReturnGenerator.exportGSTR3BJSON.bind(GSTReturnGenerator)

  /**
   * Quick method to validate and calculate tax for a simple transaction
   */
  static quickCalculate(
    amount: number,
    gstRate: number,
    supplierState: string,
    customerState: string,
    options: {
      isInclusive?: boolean
      cessRate?: number
      applyReverseCharge?: boolean
    } = {}
  ): TaxBreakdown {
    const { isInclusive = false, cessRate = 0, applyReverseCharge = false } = options

    // Validate state codes
    if (!this.isValidStateCode(supplierState)) {
      throw new GSTError(`Invalid supplier state code: ${supplierState}`, 'INVALID_STATE_CODE')
    }
    
    if (!this.isValidStateCode(customerState)) {
      throw new GSTError(`Invalid customer state code: ${customerState}`, 'INVALID_STATE_CODE')
    }

    const isInterState = !this.isIntraState(supplierState, customerState)

    return this.calculateTax({
      amount,
      gstRate,
      isInclusive,
      applyReverseCharge,
      isInterState,
      cessRate
    })
  }

  /**
   * Get comprehensive GST information for an amount
   */
  static getGSTInfo(
    amount: number,
    hsnSac?: string,
    supplierState?: string,
    customerState?: string
  ): {
    applicableRate: number
    calculation: TaxBreakdown
    hsnInfo?: { chapter: string; description: string }
    sacInfo?: { category: string; description: string }
    isInterState?: boolean
  } {
    const applicableRate = this.getApplicableGSTRate(hsnSac, amount)
    
    let isInterState = false
    if (supplierState && customerState) {
      isInterState = !this.isIntraState(supplierState, customerState)
    }

    const calculation = this.calculateTax({
      amount,
      gstRate: applicableRate,
      isInclusive: false,
      applyReverseCharge: false,
      isInterState,
      cessRate: 0
    })

    const result: any = {
      applicableRate,
      calculation,
      isInterState
    }

    if (hsnSac) {
      if (hsnSac.length <= 8 && /^[0-9]+$/.test(hsnSac)) {
        // HSN code
        result.hsnInfo = this.getHSNChapterInfo(hsnSac)
      } else if (hsnSac.length === 6 && /^[0-9]+$/.test(hsnSac)) {
        // SAC code
        result.sacInfo = this.getSACCategoryInfo(hsnSac)
      }
    }

    return result
  }

  /**
   * Batch calculate GST for multiple line items
   */
  static batchCalculate(
    items: Array<{
      amount: number
      gstRate?: number
      hsnSac?: string
      description?: string
    }>,
    supplierState: string,
    customerState: string
  ): Array<TaxBreakdown & { description?: string; hsnSac?: string }> {
    const isInterState = !this.isIntraState(supplierState, customerState)
    
    return items.map(item => {
      const gstRate = item.gstRate || this.getApplicableGSTRate(item.hsnSac, item.amount)
      
      const calculation = this.calculateTax({
        amount: item.amount,
        gstRate,
        isInclusive: false,
        applyReverseCharge: false,
        isInterState,
        cessRate: 0
      })

      return {
        ...calculation,
        description: item.description,
        hsnSac: item.hsnSac
      }
    })
  }
}

// Default export
export default GST