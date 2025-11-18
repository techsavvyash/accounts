import { describe, test, expect } from 'bun:test'
import { GSTCalculator, GSTRateManager } from '../src/calculator'
import { GSTInvoice, GSTInvoiceType, GSTTransactionType, GST_RATES } from '../src/types'

describe('GSTCalculator', () => {
  describe('calculateTax', () => {
    test('should calculate inter-state GST (IGST)', () => {
      const result = GSTCalculator.calculateTax({
        amount: 10000,
        gstRate: 18,
        isInclusive: false,
        applyReverseCharge: false,
        isInterState: true,
        cessRate: 0
      })

      expect(result.taxableAmount).toBe(10000)
      expect(result.igst).toBe(1800)
      expect(result.cgst).toBe(0)
      expect(result.sgst).toBe(0)
      expect(result.totalTax).toBe(1800)
      expect(result.totalAmount).toBe(11800)
      expect(result.isInterState).toBe(true)
    })

    test('should calculate intra-state GST (CGST + SGST)', () => {
      const result = GSTCalculator.calculateTax({
        amount: 10000,
        gstRate: 18,
        isInclusive: false,
        applyReverseCharge: false,
        isInterState: false,
        cessRate: 0
      })

      expect(result.taxableAmount).toBe(10000)
      expect(result.cgst).toBe(900)
      expect(result.sgst).toBe(900)
      expect(result.igst).toBe(0)
      expect(result.totalTax).toBe(1800)
      expect(result.totalAmount).toBe(11800)
      expect(result.isInterState).toBe(false)
    })

    test('should calculate with cess', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1000000,
        gstRate: 28,
        isInclusive: false,
        applyReverseCharge: false,
        isInterState: false,
        cessRate: 22
      })

      expect(result.taxableAmount).toBe(1000000)
      expect(result.cgst).toBe(140000)
      expect(result.sgst).toBe(140000)
      expect(result.cess).toBe(220000)
      expect(result.totalTax).toBe(500000)
      expect(result.totalAmount).toBe(1500000)
    })

    test('should calculate tax-inclusive amount', () => {
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
      expect(result.totalAmount).toBe(11800)
    })

    test('should handle 0% GST rate', () => {
      const result = GSTCalculator.calculateTax({
        amount: 1000,
        gstRate: 0,
        isInclusive: false,
        applyReverseCharge: false,
        isInterState: true,
        cessRate: 0
      })

      expect(result.taxableAmount).toBe(1000)
      expect(result.totalTax).toBe(0)
      expect(result.totalAmount).toBe(1000)
    })

    test('should handle different GST rates', () => {
      const rates = [5, 12, 18, 28]

      rates.forEach(rate => {
        const result = GSTCalculator.calculateTax({
          amount: 1000,
          gstRate: rate,
          isInclusive: false,
          applyReverseCharge: false,
          isInterState: true,
          cessRate: 0
        })

        expect(result.gstRate).toBe(rate)
        expect(result.totalTax).toBe(1000 * (rate / 100))
      })
    })
  })

  describe('calculateLineItemTax', () => {
    test('should calculate tax for line item', () => {
      const lineItem = {
        serialNo: 1,
        description: 'Laptop',
        hsnSac: '84713000',
        quantity: 2,
        unit: 'NOS',
        unitPrice: 50000,
        discount: 5, // 5% discount
        gstRate: 18,
        cessRate: 0,
        isService: false
      }

      // Inter-state: supplier state 27, customer state 29
      const result = GSTCalculator.calculateLineItemTax(lineItem, '27', '29')

      const grossAmount = 50000 * 2 // 100000
      const discountAmount = grossAmount * 0.05 // 5000
      const expectedTaxable = grossAmount - discountAmount // 95000
      const expectedTax = expectedTaxable * 0.18 // 17100

      expect(result.taxableAmount).toBe(expectedTaxable)
      expect(result.igst).toBe(expectedTax)
      expect(result.totalAmount).toBe(expectedTaxable + expectedTax)
    })

    test('should calculate for intra-state', () => {
      const lineItem = {
        serialNo: 1,
        description: 'Product',
        hsnSac: '84713000',
        quantity: 1,
        unitPrice: 10000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: false,
        unit: 'NOS'
      }

      // Intra-state: both supplier and customer in state 27
      const result = GSTCalculator.calculateLineItemTax(lineItem, '27', '27')

      expect(result.cgst).toBe(900)
      expect(result.sgst).toBe(900)
      expect(result.igst).toBe(0)
    })
  })

  describe('calculateInvoiceTax', () => {
    test('should calculate tax for complete invoice', () => {
      const invoice: GSTInvoice = {
        invoiceNumber: 'INV-001',
        invoiceDate: new Date('2024-03-15'),
        invoiceType: GSTInvoiceType.TAX_INVOICE,
        transactionType: GSTTransactionType.B2B,
        placeOfSupply: '29',

        supplierGSTIN: '27AAPFU0939F1ZV',
        supplierName: 'Test Supplier',
        supplierAddress: 'Mumbai',
        supplierState: '27',

        customerGSTIN: '29BBBBB1234C1Z5',
        customerName: 'Test Customer',
        customerAddress: 'Bangalore',
        customerState: '29',

        lineItems: [
          {
            serialNo: 1,
            description: 'Laptop',
            hsnSac: '84713000',
            quantity: 2,
            unit: 'NOS',
            unitPrice: 50000,
            discount: 0,
            gstRate: 18,
            cessRate: 0,
            isService: false
          },
          {
            serialNo: 2,
            description: 'Mouse',
            hsnSac: '84716000',
            quantity: 5,
            unit: 'NOS',
            unitPrice: 500,
            discount: 4, // 4% discount
            gstRate: 18,
            cessRate: 0,
            isService: false
          }
        ],

        reverseCharge: false
      }

      const result = GSTCalculator.calculateInvoiceTax(invoice)

      expect(result.lineItemCalculations).toHaveLength(2)
      expect(result.totals.totalInvoiceAmount).toBeGreaterThan(0)
      expect(result.totals.totalTax).toBeGreaterThan(0)
      expect(result.totals.totalTaxableAmount).toBeGreaterThan(0)
    })

    test('should aggregate totals correctly', () => {
      const invoice: GSTInvoice = {
        invoiceNumber: 'INV-002',
        invoiceDate: new Date('2024-03-15'),
        invoiceType: GSTInvoiceType.TAX_INVOICE,
        transactionType: GSTTransactionType.B2B,
        placeOfSupply: '29',

        supplierGSTIN: '27AAPFU0939F1ZV',
        supplierName: 'Test Supplier',
        supplierAddress: 'Mumbai',
        supplierState: '27',

        customerGSTIN: '29BBBBB1234C1Z5',
        customerName: 'Test Customer',
        customerAddress: 'Bangalore',
        customerState: '29',

        lineItems: [
          {
            serialNo: 1,
            description: 'Item 1',
            hsnSac: '84713000',
            quantity: 1,
            unit: 'NOS',
            unitPrice: 10000,
            discount: 0,
            gstRate: 18,
            cessRate: 0,
            isService: false
          },
          {
            serialNo: 2,
            description: 'Item 2',
            hsnSac: '84713000',
            quantity: 1,
            unit: 'NOS',
            unitPrice: 5000,
            discount: 0,
            gstRate: 18,
            cessRate: 0,
            isService: false
          }
        ],

        reverseCharge: false
      }

      const result = GSTCalculator.calculateInvoiceTax(invoice)

      expect(result.totals.totalTaxableAmount).toBe(15000)
      expect(result.totals.totalIGST).toBe(2700)
      expect(result.totals.totalTax).toBe(2700)
      expect(result.totals.totalInvoiceAmount).toBe(17700)
    })
  })

  describe('calculateReverseGST', () => {
    test('should calculate base amount from total', () => {
      const result = GSTCalculator.calculateReverseGST(11800, 18, true)

      expect(result.taxableAmount).toBe(10000)
      expect(result.gstAmount).toBe(1800)
    })

    test('should work for different rates', () => {
      const result = GSTCalculator.calculateReverseGST(1120, 12, true)

      expect(result.taxableAmount).toBe(1000)
      expect(result.gstAmount).toBe(120)
    })
  })

  describe('getApplicableGSTRate', () => {
    test('should return default rate when no HSN provided', () => {
      const rate = GSTCalculator.getApplicableGSTRate()
      expect(rate).toBe(GST_RATES.GST_18)
    })

    test('should return rate from HSN registry when available', () => {
      const rate = GSTCalculator.getApplicableGSTRate('847130')
      expect(rate).toBe(18)
    })

    test('should fallback to chapter-based logic', () => {
      const rate1 = GSTCalculator.getApplicableGSTRate('8499')
      expect(rate1).toBe(18) // Chapter 84 - machinery

      const rate2 = GSTCalculator.getApplicableGSTRate('30')
      expect(rate2).toBe(12) // Pharmaceuticals
    })
  })
})

describe('GSTRateManager', () => {
  test('should set and get custom rates', () => {
    GSTRateManager.setCustomRate('12345678', 28)
    const rate = GSTRateManager.getRate('12345678')
    expect(rate).toBe(28)
  })

  test('should return rate for unregistered codes', () => {
    // GSTRateManager delegates to calculator which returns default rate
    const rate = GSTRateManager.getRate('99999999')
    expect(typeof rate).toBe('number')
  })

  test('should handle custom rates', () => {
    GSTRateManager.setCustomRate('12345678', 28)
    const rate1 = GSTRateManager.getRate('12345678')
    expect(rate1).toBe(28)

    GSTRateManager.clearCustomRates()
    const rate2 = GSTRateManager.getRate('12345678')
    // After clearing, should fall back to default logic
    expect(typeof rate2).toBe('number')
  })

  test('should return all standard rates', () => {
    const rates = GSTRateManager.getAllStandardRates()
    expect(rates).toEqual(GST_RATES)
    expect(rates.GST_18).toBe(18)
    expect(rates.GST_28).toBe(28)
  })
})
