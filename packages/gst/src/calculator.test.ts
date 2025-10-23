import { describe, it, expect, beforeEach } from 'bun:test'
import { GSTCalculator, GSTRateManager } from './calculator'
import { GSTInvoice, GSTTransactionType, TaxCalculationError, GST_RATES } from './types'

describe('GSTCalculator', () => {
  describe('calculateTax', () => {
    it('should calculate GST correctly for exclusive amount', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1000,
        gstRate: 18,
        isInclusive: false,
        isInterState: false
      })

      expect(result.taxableAmount).toBe(1000)
      expect(result.cgst).toBe(90) // 9% of 1000
      expect(result.sgst).toBe(90) // 9% of 1000
      expect(result.igst).toBe(0)
      expect(result.totalTax).toBe(180)
      expect(result.totalAmount).toBe(1180)
      expect(result.isInterState).toBe(false)
    })

    it('should calculate GST correctly for inclusive amount', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1180,
        gstRate: 18,
        isInclusive: true,
        isInterState: false
      })

      expect(result.taxableAmount).toBe(1000)
      expect(result.cgst).toBe(90)
      expect(result.sgst).toBe(90)
      expect(result.totalTax).toBe(180)
      expect(result.totalAmount).toBe(1180)
    })

    it('should calculate IGST for inter-state transactions', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1000,
        gstRate: 18,
        isInclusive: false,
        isInterState: true
      })

      expect(result.cgst).toBe(0)
      expect(result.sgst).toBe(0)
      expect(result.igst).toBe(180)
      expect(result.totalTax).toBe(180)
      expect(result.isInterState).toBe(true)
    })

    it('should include cess in calculations', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1000,
        gstRate: 28,
        cessRate: 12,
        isInclusive: false,
        isInterState: false
      })

      expect(result.taxableAmount).toBe(1000)
      expect(result.cgst).toBe(140) // 14% of 1000
      expect(result.sgst).toBe(140) // 14% of 1000
      expect(result.cess).toBe(120) // 12% of 1000
      expect(result.totalTax).toBe(400) // 280 + 120
      expect(result.totalAmount).toBe(1400)
    })

    it('should throw error for negative amount', () => {
      expect(() => {
        GSTCalculator.calculateTax({
          amount: -100,
          gstRate: 18
        })
      }).toThrow(TaxCalculationError)
    })

    it('should throw error for invalid GST rate', () => {
      expect(() => {
        GSTCalculator.calculateTax({
          amount: 1000,
          gstRate: 60 // Invalid rate
        })
      }).toThrow(TaxCalculationError)
    })

    it('should throw error for negative cess rate', () => {
      expect(() => {
        GSTCalculator.calculateTax({
          amount: 1000,
          gstRate: 18,
          cessRate: -5
        })
      }).toThrow(TaxCalculationError)
    })
  })

  describe('calculateLineItemTax', () => {
    it('should calculate line item tax correctly', () => {
      const lineItem = {
        serialNo: 1,
        description: 'Test Product',
        hsnSac: '8471',
        quantity: 5,
        unit: 'PCS',
        unitPrice: 200,
        discount: 10, // 10%
        gstRate: 18,
        cessRate: 0,
        isService: false
      }

      const result = GSTCalculator.calculateLineItemTax(
        lineItem,
        '29', // Karnataka
        '29', // Karnataka (intra-state)
        false
      )

      // Gross: 5 * 200 = 1000
      // Discount: 10% of 1000 = 100
      // Line total: 900
      // Tax: 18% of 900 = 162
      expect(result.lineTotal).toBe(900)
      expect(result.taxableAmount).toBe(900)
      expect(result.cgst).toBe(81)
      expect(result.sgst).toBe(81)
      expect(result.totalTax).toBe(162)
      expect(result.totalAmount).toBe(1062)
    })

    it('should handle inter-state line items', () => {
      const lineItem = {
        serialNo: 1,
        description: 'Test Service',
        quantity: 2,
        unit: 'HRS',
        unitPrice: 1000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: true
      }

      const result = GSTCalculator.calculateLineItemTax(
        lineItem,
        '29', // Karnataka
        '27', // Maharashtra (inter-state)
        false
      )

      expect(result.lineTotal).toBe(2000)
      expect(result.igst).toBe(360)
      expect(result.cgst).toBe(0)
      expect(result.sgst).toBe(0)
      expect(result.totalTax).toBe(360)
    })
  })

  describe('calculateInvoiceTax', () => {
    it('should calculate invoice totals correctly', () => {
      const invoice: GSTInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2024-01-15'),
        invoiceType: 'Tax Invoice',
        transactionType: GSTTransactionType.B2B,
        placeOfSupply: '29',

        supplierGSTIN: '29ABCDE1234F1Z5',
        supplierName: 'Test Supplier',
        supplierAddress: 'Test Address',
        supplierState: '29',

        customerGSTIN: '29FGHIJ5678K1L2',
        customerName: 'Test Customer',
        customerAddress: 'Test Address',
        customerState: '29',

        lineItems: [
          {
            serialNo: 1,
            description: 'Product A',
            quantity: 2,
            unit: 'PCS',
            unitPrice: 500,
            discount: 0,
            gstRate: 18,
            cessRate: 0,
            isService: false
          },
          {
            serialNo: 2,
            description: 'Product B',
            quantity: 1,
            unit: 'PCS',
            unitPrice: 1000,
            discount: 10,
            gstRate: 12,
            cessRate: 0,
            isService: false
          }
        ],

        reverseCharge: false
      }

      const result = GSTCalculator.calculateInvoiceTax(invoice)

      // Line 1: 2 * 500 = 1000, tax = 180
      // Line 2: 1 * 1000 = 1000, discount = 100, taxable = 900, tax = 108
      expect(result.lineItemCalculations).toHaveLength(2)
      expect(result.totals.totalTaxableAmount).toBe(1900)
      expect(result.totals.totalTax).toBe(288)
      expect(result.totals.totalInvoiceAmount).toBe(2188)
    })

    it('should handle mixed inter-state and intra-state in invoice', () => {
      const invoice: GSTInvoice = {
        invoiceNumber: 'INV-002',
        invoiceDate: new Date('2024-01-15'),
        invoiceType: 'Tax Invoice',
        transactionType: GSTTransactionType.B2B,
        placeOfSupply: '27',

        supplierGSTIN: '29ABCDE1234F1Z5',
        supplierName: 'Test Supplier',
        supplierAddress: 'Test Address',
        supplierState: '29',

        customerGSTIN: '27XYZAB1234C1D2',
        customerName: 'Test Customer',
        customerAddress: 'Test Address',
        customerState: '27',

        lineItems: [
          {
            serialNo: 1,
            description: 'Product',
            quantity: 1,
            unit: 'PCS',
            unitPrice: 1000,
            discount: 0,
            gstRate: 18,
            cessRate: 0,
            isService: false
          }
        ],

        reverseCharge: false
      }

      const result = GSTCalculator.calculateInvoiceTax(invoice)

      // Inter-state: should use IGST
      expect(result.totals.totalIGST).toBe(180)
      expect(result.totals.totalCGST).toBe(0)
      expect(result.totals.totalSGST).toBe(0)
    })
  })

  describe('calculateReverseGST', () => {
    it('should extract GST from inclusive amount', () => {
      const result = GSTCalculator.calculateReverseGST(1180, 18)

      expect(result.taxableAmount).toBe(1000)
      expect(result.gstAmount).toBe(180)
    })

    it('should handle different GST rates', () => {
      const result5 = GSTCalculator.calculateReverseGST(1050, 5)
      expect(result5.taxableAmount).toBe(1000)
      expect(result5.gstAmount).toBe(50)

      const result12 = GSTCalculator.calculateReverseGST(1120, 12)
      expect(result12.taxableAmount).toBe(1000)
      expect(result12.gstAmount).toBe(120)

      const result28 = GSTCalculator.calculateReverseGST(1280, 28)
      expect(result28.taxableAmount).toBe(1000)
      expect(result28.gstAmount).toBe(280)
    })

    it('should throw error for invalid inputs', () => {
      expect(() => {
        GSTCalculator.calculateReverseGST(-100, 18)
      }).toThrow(TaxCalculationError)

      expect(() => {
        GSTCalculator.calculateReverseGST(1000, 60)
      }).toThrow(TaxCalculationError)
    })
  })

  describe('getApplicableGSTRate', () => {
    it('should return default rate when no HSN provided', () => {
      const rate = GSTCalculator.getApplicableGSTRate()
      expect(rate).toBe(GST_RATES.GST_18)
    })

    it('should return appropriate rates for essential items', () => {
      expect(GSTCalculator.getApplicableGSTRate('0101')).toBe(GST_RATES.EXEMPT)
      expect(GSTCalculator.getApplicableGSTRate('0702')).toBe(GST_RATES.EXEMPT)
    })

    it('should return 5% for textiles and processed foods', () => {
      expect(GSTCalculator.getApplicableGSTRate('1101')).toBe(GST_RATES.GST_5)
      expect(GSTCalculator.getApplicableGSTRate('1501')).toBe(GST_RATES.GST_5)
    })

    it('should return 12% for industrial inputs', () => {
      expect(GSTCalculator.getApplicableGSTRate('2501')).toBe(GST_RATES.GST_12)
      expect(GSTCalculator.getApplicableGSTRate('2801')).toBe(GST_RATES.GST_12)
    })

    it('should return 18% for most goods', () => {
      expect(GSTCalculator.getApplicableGSTRate('8471')).toBe(GST_RATES.GST_18)
      expect(GSTCalculator.getApplicableGSTRate('8501')).toBe(GST_RATES.GST_18)
    })

    it('should return 28% for luxury items', () => {
      expect(GSTCalculator.getApplicableGSTRate('2201')).toBe(GST_RATES.GST_28)
      expect(GSTCalculator.getApplicableGSTRate('2401')).toBe(GST_RATES.GST_28)
    })

    it('should return 18% for services (SAC codes)', () => {
      expect(GSTCalculator.getApplicableGSTRate('998314')).toBe(GST_RATES.GST_18)
    })
  })

  describe('calculateCompositeRate', () => {
    it('should calculate weighted average GST rate', () => {
      const supplies = [
        { amount: 1000, gstRate: 18 },
        { amount: 500, gstRate: 12 },
        { amount: 500, gstRate: 5 }
      ]

      const compositeRate = GSTCalculator.calculateCompositeRate(supplies)

      // (1000*18 + 500*12 + 500*5) / 2000 = (18000 + 6000 + 2500) / 2000 = 13.25
      expect(compositeRate).toBe(13.25)
    })

    it('should throw error for empty supplies', () => {
      expect(() => {
        GSTCalculator.calculateCompositeRate([])
      }).toThrow(TaxCalculationError)
    })

    it('should throw error when total amount is zero', () => {
      expect(() => {
        GSTCalculator.calculateCompositeRate([
          { amount: 0, gstRate: 18 }
        ])
      }).toThrow(TaxCalculationError)
    })
  })

  describe('calculateTDSOnGST', () => {
    it('should calculate TDS on GST amount', () => {
      const result = GSTCalculator.calculateTDSOnGST(10000, 18, 2)

      expect(result.gstAmount).toBe(1800) // 18% of 10000
      expect(result.tdsAmount).toBe(36) // 2% of 1800
      expect(result.netPayable).toBe(11764) // 10000 + 1800 - 36
    })

    it('should use default TDS rate if not provided', () => {
      const result = GSTCalculator.calculateTDSOnGST(10000, 18)

      expect(result.tdsAmount).toBe(36) // 2% of 1800 (default rate)
    })

    it('should throw error for invalid taxable amount', () => {
      expect(() => {
        GSTCalculator.calculateTDSOnGST(-1000, 18, 2)
      }).toThrow(TaxCalculationError)
    })
  })
})

describe('GSTRateManager', () => {
  beforeEach(() => {
    GSTRateManager.clearCustomRates()
  })

  describe('setCustomRate', () => {
    it('should set custom rate for HSN code', () => {
      GSTRateManager.setCustomRate('8471', 12)
      const rate = GSTRateManager.getRate('8471')
      expect(rate).toBe(12)
    })

    it('should be case insensitive', () => {
      GSTRateManager.setCustomRate('ABCD', 18)
      const rate = GSTRateManager.getRate('abcd')
      expect(rate).toBe(18)
    })

    it('should throw error for invalid rate', () => {
      expect(() => {
        GSTRateManager.setCustomRate('1234', 60)
      }).toThrow(TaxCalculationError)

      expect(() => {
        GSTRateManager.setCustomRate('1234', -5)
      }).toThrow(TaxCalculationError)
    })
  })

  describe('getRate', () => {
    it('should return custom rate if set', () => {
      GSTRateManager.setCustomRate('1234', 15)
      expect(GSTRateManager.getRate('1234')).toBe(15)
    })

    it('should return standard rate if no custom rate', () => {
      const rate = GSTRateManager.getRate('8471')
      expect(rate).toBe(18) // Standard rate for electronics
    })
  })

  describe('clearCustomRates', () => {
    it('should clear all custom rates', () => {
      GSTRateManager.setCustomRate('1234', 15)
      GSTRateManager.setCustomRate('5678', 20)

      GSTRateManager.clearCustomRates()

      // Should now return standard rates
      expect(GSTRateManager.getRate('1234')).not.toBe(15)
    })
  })

  describe('getAllStandardRates', () => {
    it('should return all standard GST rates', () => {
      const rates = GSTRateManager.getAllStandardRates()

      expect(rates.EXEMPT).toBe(0)
      expect(rates.GST_5).toBe(5)
      expect(rates.GST_12).toBe(12)
      expect(rates.GST_18).toBe(18)
      expect(rates.GST_28).toBe(28)
    })
  })
})
