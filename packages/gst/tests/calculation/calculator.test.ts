import { describe, test, expect, beforeEach } from 'bun:test'
import { GSTCalculator, GSTRateManager } from '../../src/calculation'
import { TaxCalculationError } from '../../src/core'

describe('GSTCalculator', () => {
  beforeEach(() => {
    // Reset custom rates before each test
    GSTRateManager.clearCustomRates()
  })

  describe('calculateTax()', () => {
    describe('Intra-state transactions (CGST + SGST)', () => {
      test('should calculate tax for basic intra-state transaction', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(10000)
        expect(result.cgst).toBe(900) // 9% of 10000
        expect(result.sgst).toBe(900) // 9% of 10000
        expect(result.igst).toBe(0)
        expect(result.cess).toBe(0)
        expect(result.totalTax).toBe(1800)
        expect(result.totalAmount).toBe(11800)
        expect(result.isInterState).toBe(false)
        expect(result.isInclusive).toBe(false)
      })

      test('should calculate tax with 5% GST rate', () => {
        const result = GSTCalculator.calculateTax({
          amount: 5000,
          gstRate: 5,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(5000)
        expect(result.cgst).toBe(125) // 2.5% of 5000
        expect(result.sgst).toBe(125) // 2.5% of 5000
        expect(result.totalTax).toBe(250)
        expect(result.totalAmount).toBe(5250)
      })

      test('should calculate tax with 12% GST rate', () => {
        const result = GSTCalculator.calculateTax({
          amount: 8000,
          gstRate: 12,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.cgst).toBe(480) // 6% of 8000
        expect(result.sgst).toBe(480)
        expect(result.totalTax).toBe(960)
      })

      test('should calculate tax with 28% GST rate', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 28,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.cgst).toBe(1400) // 14% of 10000
        expect(result.sgst).toBe(1400)
        expect(result.totalTax).toBe(2800)
        expect(result.totalAmount).toBe(12800)
      })

      test('should handle 0% GST (exempt)', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 0,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.cgst).toBe(0)
        expect(result.sgst).toBe(0)
        expect(result.totalTax).toBe(0)
        expect(result.totalAmount).toBe(10000)
      })
    })

    describe('Inter-state transactions (IGST)', () => {
      test('should calculate IGST for inter-state transaction', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: true,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(10000)
        expect(result.cgst).toBe(0)
        expect(result.sgst).toBe(0)
        expect(result.igst).toBe(1800) // 18% of 10000
        expect(result.totalTax).toBe(1800)
        expect(result.totalAmount).toBe(11800)
        expect(result.isInterState).toBe(true)
      })

      test('should calculate IGST for different rates', () => {
        const testCases = [
          { amount: 5000, rate: 5, expectedIGST: 250 },
          { amount: 8000, rate: 12, expectedIGST: 960 },
          { amount: 10000, rate: 18, expectedIGST: 1800 },
          { amount: 15000, rate: 28, expectedIGST: 4200 },
        ]

        testCases.forEach(({ amount, rate, expectedIGST }) => {
          const result = GSTCalculator.calculateTax({
            amount,
            gstRate: rate,
            isInclusive: false,
            applyReverseCharge: false,
            isInterState: true,
            cessRate: 0
          })

          expect(result.igst).toBe(expectedIGST)
          expect(result.cgst).toBe(0)
          expect(result.sgst).toBe(0)
        })
      })
    })

    describe('Tax-inclusive calculations', () => {
      test('should calculate backwards from inclusive amount (intra-state)', () => {
        const result = GSTCalculator.calculateTax({
          amount: 11800, // Including 18% GST
          gstRate: 18,
          isInclusive: true,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(10000)
        expect(result.cgst).toBe(900)
        expect(result.sgst).toBe(900)
        expect(result.totalTax).toBe(1800)
        expect(result.totalAmount).toBe(11800)
        expect(result.isInclusive).toBe(true)
      })

      test('should calculate backwards from inclusive amount (inter-state)', () => {
        const result = GSTCalculator.calculateTax({
          amount: 11800,
          gstRate: 18,
          isInclusive: true,
          applyReverseCharge: false,
          isInterState: true,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(10000)
        expect(result.igst).toBe(1800)
        expect(result.totalTax).toBe(1800)
        expect(result.totalAmount).toBe(11800)
      })

      test('should handle different rates with inclusive pricing', () => {
        const testCases = [
          { inclusive: 10500, rate: 5, expectedBase: 10000, expectedTax: 500 },
          { inclusive: 11200, rate: 12, expectedBase: 10000, expectedTax: 1200 },
          { inclusive: 12800, rate: 28, expectedBase: 10000, expectedTax: 2800 },
        ]

        testCases.forEach(({ inclusive, rate, expectedBase, expectedTax }) => {
          const result = GSTCalculator.calculateTax({
            amount: inclusive,
            gstRate: rate,
            isInclusive: true,
            applyReverseCharge: false,
            isInterState: false,
            cessRate: 0
          })

          expect(result.taxableAmount).toBe(expectedBase)
          expect(result.totalTax).toBe(expectedTax)
          expect(result.totalAmount).toBe(inclusive)
        })
      })
    })

    describe('Cess calculations', () => {
      test('should calculate cess on intra-state transaction', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 28,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 3 // 3% cess
        })

        expect(result.cgst).toBe(1400)
        expect(result.sgst).toBe(1400)
        expect(result.cess).toBe(300) // 3% of 10000
        expect(result.totalTax).toBe(3100) // 1400 + 1400 + 300
        expect(result.totalAmount).toBe(13100)
      })

      test('should calculate cess on inter-state transaction', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 28,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: true,
          cessRate: 5
        })

        expect(result.igst).toBe(2800)
        expect(result.cess).toBe(500)
        expect(result.totalTax).toBe(3300)
      })

      test('should calculate cess with inclusive pricing', () => {
        const result = GSTCalculator.calculateTax({
          amount: 13100, // Including 28% GST + 3% cess
          gstRate: 28,
          isInclusive: true,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 3
        })

        expect(result.taxableAmount).toBe(10000)
        expect(result.cess).toBe(300)
        expect(result.totalTax).toBe(3100)
      })
    })

    describe('Reverse charge mechanism', () => {
      test('should apply reverse charge flag', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: true,
          isInterState: false,
          cessRate: 0
        })

        // Reverse charge doesn't change the calculation, just flags it
        expect(result.cgst).toBe(900)
        expect(result.sgst).toBe(900)
        expect(result.totalTax).toBe(1800)
      })
    })

    describe('Edge cases and validations', () => {
      test('should handle decimal amounts', () => {
        const result = GSTCalculator.calculateTax({
          amount: 999.99,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.taxableAmount).toBe(999.99)
        expect(result.cgst).toBeCloseTo(89.999, 2)
        expect(result.sgst).toBeCloseTo(89.999, 2)
        expect(result.totalTax).toBeCloseTo(179.998, 2)
      })

      test('should handle very small amounts', () => {
        const result = GSTCalculator.calculateTax({
          amount: 1,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.totalTax).toBeCloseTo(0.18, 2)
      })

      test('should handle very large amounts', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000000,
          gstRate: 18,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.totalTax).toBe(1800000)
      })

      test('should handle fractional GST rates', () => {
        const result = GSTCalculator.calculateTax({
          amount: 10000,
          gstRate: 18.5,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: false,
          cessRate: 0
        })

        expect(result.cgst).toBe(925) // 9.25% of 10000
        expect(result.sgst).toBe(925)
        expect(result.totalTax).toBe(1850)
      })
    })
  })

  describe('calculateLineItemTax()', () => {
    test('should calculate tax for a single line item', () => {
      const lineItem = {
        description: 'Product A',
        quantity: 10,
        unitPrice: 1000,
        gstRate: 18,
        discount: 0,
        cessRate: 0
      }

      const result = GSTCalculator.calculateLineItemTax(lineItem, false)

      expect(result.baseAmount).toBe(10000) // 10 * 1000
      expect(result.discountAmount).toBe(0)
      expect(result.taxableAmount).toBe(10000)
      expect(result.tax.cgst).toBe(900)
      expect(result.tax.sgst).toBe(900)
      expect(result.tax.totalTax).toBe(1800)
      expect(result.totalAmount).toBe(11800)
    })

    test('should apply discount before tax calculation', () => {
      const lineItem = {
        description: 'Product B',
        quantity: 5,
        unitPrice: 2000,
        gstRate: 18,
        discount: 1000, // Flat discount
        cessRate: 0
      }

      const result = GSTCalculator.calculateLineItemTax(lineItem, false)

      expect(result.baseAmount).toBe(10000)
      expect(result.discountAmount).toBe(1000)
      expect(result.taxableAmount).toBe(9000)
      expect(result.tax.totalTax).toBe(1620) // 18% of 9000
      expect(result.totalAmount).toBe(10620)
    })

    test('should calculate with cess', () => {
      const lineItem = {
        description: 'Luxury Item',
        quantity: 2,
        unitPrice: 10000,
        gstRate: 28,
        discount: 0,
        cessRate: 5
      }

      const result = GSTCalculator.calculateLineItemTax(lineItem, false)

      expect(result.tax.cgst).toBe(2800)
      expect(result.tax.sgst).toBe(2800)
      expect(result.tax.cess).toBe(1000)
      expect(result.tax.totalTax).toBe(6600)
    })

    test('should handle inter-state line item', () => {
      const lineItem = {
        description: 'Product C',
        quantity: 3,
        unitPrice: 5000,
        gstRate: 18,
        discount: 0,
        cessRate: 0
      }

      const result = GSTCalculator.calculateLineItemTax(lineItem, true)

      expect(result.taxableAmount).toBe(15000)
      expect(result.tax.igst).toBe(2700)
      expect(result.tax.cgst).toBe(0)
      expect(result.tax.sgst).toBe(0)
    })
  })

  describe('calculateInvoiceTax()', () => {
    test('should calculate total tax for multiple line items', () => {
      const lineItems = [
        {
          description: 'Item 1',
          quantity: 2,
          unitPrice: 1000,
          gstRate: 18,
          discount: 0,
          cessRate: 0
        },
        {
          description: 'Item 2',
          quantity: 1,
          unitPrice: 5000,
          gstRate: 12,
          discount: 0,
          cessRate: 0
        },
        {
          description: 'Item 3',
          quantity: 3,
          unitPrice: 500,
          gstRate: 5,
          discount: 0,
          cessRate: 0
        }
      ]

      const result = GSTCalculator.calculateInvoiceTax(lineItems, false)

      expect(result.lineItemTaxes).toHaveLength(3)
      expect(result.subtotal).toBe(8500) // 2000 + 5000 + 1500
      expect(result.totalTax).toBe(1035) // 360 + 600 + 75
      expect(result.grandTotal).toBe(9535)
    })

    test('should aggregate taxes by rate', () => {
      const lineItems = [
        {
          description: 'Item 1',
          quantity: 1,
          unitPrice: 10000,
          gstRate: 18,
          discount: 0,
          cessRate: 0
        },
        {
          description: 'Item 2',
          quantity: 1,
          unitPrice: 10000,
          gstRate: 18,
          discount: 0,
          cessRate: 0
        }
      ]

      const result = GSTCalculator.calculateInvoiceTax(lineItems, false)

      expect(result.taxBreakdown['18']).toEqual({
        taxableAmount: 20000,
        cgst: 1800,
        sgst: 1800,
        igst: 0,
        cess: 0,
        totalTax: 3600
      })
    })

    test('should handle mixed intra and inter-state (edge case)', () => {
      const lineItems = [
        {
          description: 'Item 1',
          quantity: 1,
          unitPrice: 10000,
          gstRate: 18,
          discount: 0,
          cessRate: 0
        }
      ]

      // This tests the consistent application of isInterState
      const intraResult = GSTCalculator.calculateInvoiceTax(lineItems, false)
      const interResult = GSTCalculator.calculateInvoiceTax(lineItems, true)

      expect(intraResult.totalTax).toBe(interResult.totalTax)
      expect(intraResult.lineItemTaxes[0].tax.cgst).toBe(900)
      expect(interResult.lineItemTaxes[0].tax.igst).toBe(1800)
    })
  })

  describe('calculateReverseGST()', () => {
    test('should reverse calculate from total with tax', () => {
      const result = GSTCalculator.calculateReverseGST(11800, 18, false)

      expect(result.taxableAmount).toBe(10000)
      expect(result.totalTax).toBe(1800)
      expect(result.totalAmount).toBe(11800)
    })

    test('should reverse calculate for inter-state', () => {
      const result = GSTCalculator.calculateReverseGST(11800, 18, true)

      expect(result.taxableAmount).toBe(10000)
      expect(result.igst).toBe(1800)
      expect(result.cgst).toBe(0)
      expect(result.sgst).toBe(0)
    })
  })

  describe('Integration and real-world scenarios', () => {
    test('should calculate restaurant bill with 5% GST', () => {
      const lineItems = [
        { description: 'Main Course', quantity: 2, unitPrice: 350, gstRate: 5, discount: 0, cessRate: 0 },
        { description: 'Beverage', quantity: 2, unitPrice: 100, gstRate: 5, discount: 0, cessRate: 0 },
        { description: 'Dessert', quantity: 1, unitPrice: 150, gstRate: 5, discount: 0, cessRate: 0 },
      ]

      const result = GSTCalculator.calculateInvoiceTax(lineItems, false)

      expect(result.subtotal).toBe(950)
      expect(result.totalTax).toBe(47.5) // 5% of 950
      expect(result.grandTotal).toBe(997.5)
    })

    test('should calculate electronics purchase with 18% GST', () => {
      const lineItems = [
        { description: 'Laptop', quantity: 1, unitPrice: 50000, gstRate: 18, discount: 2000, cessRate: 0 },
        { description: 'Mouse', quantity: 1, unitPrice: 500, gstRate: 18, discount: 0, cessRate: 0 },
        { description: 'Keyboard', quantity: 1, unitPrice: 1500, gstRate: 18, discount: 0, cessRate: 0 },
      ]

      const result = GSTCalculator.calculateInvoiceTax(lineItems, false)

      const laptopTaxable = 50000 - 2000 // After discount
      const totalTaxable = laptopTaxable + 500 + 1500

      expect(result.subtotal).toBe(totalTaxable)
      expect(result.totalTax).toBe(totalTaxable * 0.18)
    })

    test('should calculate luxury car with 28% GST + cess', () => {
      const lineItems = [
        { description: 'Luxury Car', quantity: 1, unitPrice: 5000000, gstRate: 28, discount: 0, cessRate: 15 }
      ]

      const result = GSTCalculator.calculateInvoiceTax(lineItems, false)

      expect(result.totalTax).toBe(1400000 + 1400000 + 750000) // CGST + SGST + Cess
      expect(result.grandTotal).toBe(7550000)
    })
  })
})

describe('GSTRateManager', () => {
  beforeEach(() => {
    GSTRateManager.clearCustomRates()
  })

  describe('setCustomRate()', () => {
    test('should set custom rate for HSN code', () => {
      GSTRateManager.setCustomRate('1001', 5)

      expect(GSTRateManager.getRate('1001')).toBe(5)
    })

    test('should override existing custom rate', () => {
      GSTRateManager.setCustomRate('1001', 5)
      GSTRateManager.setCustomRate('1001', 12)

      expect(GSTRateManager.getRate('1001')).toBe(12)
    })
  })

  describe('getRate()', () => {
    test('should return standard rate when no custom rate set', () => {
      expect(GSTRateManager.getRate('1001')).toBe(18) // Default
    })

    test('should return custom rate when set', () => {
      GSTRateManager.setCustomRate('8471', 28)

      expect(GSTRateManager.getRate('8471')).toBe(28)
    })
  })

  describe('clearCustomRates()', () => {
    test('should clear all custom rates', () => {
      GSTRateManager.setCustomRate('1001', 5)
      GSTRateManager.setCustomRate('8471', 28)
      GSTRateManager.clearCustomRates()

      expect(GSTRateManager.getRate('1001')).toBe(18) // Back to default
      expect(GSTRateManager.getRate('8471')).toBe(18)
    })
  })

  describe('getAllStandardRates()', () => {
    test('should return all standard GST rates', () => {
      const rates = GSTRateManager.getAllStandardRates()

      expect(rates).toContain(0)
      expect(rates).toContain(5)
      expect(rates).toContain(12)
      expect(rates).toContain(18)
      expect(rates).toContain(28)
    })
  })
})
