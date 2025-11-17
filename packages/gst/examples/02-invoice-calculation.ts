/**
 * Example 2: Invoice-level GST Calculation
 *
 * This example demonstrates how to calculate GST for complete invoices
 * with multiple line items.
 */

import {
  GST,
  GSTCalculator,
  GSTInvoice,
  GSTInvoiceType,
  GSTTransactionType
} from '../src/index'

console.log('=== Example 2: Invoice-level GST Calculation ===\n')

// Example 2.1: B2B Invoice with Multiple Line Items
console.log('2.1 B2B Invoice (Inter-state)')

const b2bInvoice: GSTInvoice = {
  invoiceNumber: 'INV-2024-001',
  invoiceDate: new Date('2024-03-15'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2B,
  placeOfSupply: '29', // Karnataka

  // Supplier Details (Maharashtra)
  supplierGSTIN: '27AAPFU0939F1ZV',
  supplierName: 'Tech Solutions Pvt Ltd',
  supplierAddress: 'Andheri East, Mumbai, Maharashtra - 400069',
  supplierState: '27',

  // Customer Details (Karnataka)
  customerGSTIN: '29BBBBB1234C1Z5',
  customerName: 'Business Enterprises Ltd',
  customerAddress: 'Koramangala, Bangalore, Karnataka - 560034',
  customerState: '29',

  // Line Items
  lineItems: [
    {
      serialNo: 1,
      description: 'Dell Laptop - Inspiron 15',
      hsnSac: '84713000',
      quantity: 5,
      unit: 'NOS',
      unitPrice: 45000,
      discount: 2250, // 5% discount
      gstRate: 18,
      cessRate: 0,
      isService: false
    },
    {
      serialNo: 2,
      description: 'HP Laser Printer',
      hsnSac: '84433100',
      quantity: 2,
      unit: 'NOS',
      unitPrice: 15000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: false
    },
    {
      serialNo: 3,
      description: 'Microsoft Office License',
      hsnSac: '998313',
      quantity: 10,
      unit: 'NOS',
      unitPrice: 5000,
      discount: 5000, // 10% discount
      gstRate: 18,
      cessRate: 0,
      isService: true
    }
  ],

  reverseCharge: false,
  notes: 'Payment Terms: Net 30 days'
}

const b2bCalc = GSTCalculator.calculateInvoiceTax(b2bInvoice)

console.log('Invoice Number:', b2bInvoice.invoiceNumber)
console.log('Invoice Date:', b2bInvoice.invoiceDate.toLocaleDateString('en-IN'))
console.log('Customer:', b2bInvoice.customerName)
console.log('Customer GSTIN:', b2bInvoice.customerGSTIN)
console.log()

console.log('Line Items:')
b2bCalc.lineItemCalculations.forEach((item, index) => {
  const lineItem = b2bInvoice.lineItems[index]
  console.log(`\n  ${lineItem.serialNo}. ${lineItem.description}`)
  console.log(`     HSN: ${lineItem.hsnSac}`)
  console.log(`     Qty: ${lineItem.quantity} ${lineItem.unit} @ ₹${lineItem.unitPrice}`)
  console.log(`     Discount: ₹${lineItem.discount}`)
  console.log(`     Taxable Amount: ₹${item.taxableAmount}`)
  console.log(`     IGST (18%): ₹${item.igst}`)
  console.log(`     Line Total: ₹${item.totalAmount}`)
})

console.log('\nInvoice Totals:')
console.log('  Subtotal:', b2bCalc.totals.subtotal)
console.log('  Total Discount:', b2bCalc.totals.totalDiscount)
console.log('  Taxable Amount:', b2bCalc.totals.taxableAmount)
console.log('  IGST:', b2bCalc.totals.totalIGST)
console.log('  CGST:', b2bCalc.totals.totalCGST)
console.log('  SGST:', b2bCalc.totals.totalSGST)
console.log('  Total Tax:', b2bCalc.totals.totalTax)
console.log('  Total Invoice Amount: ₹' + b2bCalc.totals.totalInvoiceAmount)
console.log()

// Example 2.2: B2C Invoice (Intra-state)
console.log('2.2 B2C Invoice (Intra-state - Retail Sale)')

const b2cInvoice: GSTInvoice = {
  invoiceNumber: 'RETAIL-2024-042',
  invoiceDate: new Date('2024-03-20'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2C,
  placeOfSupply: '27',

  supplierGSTIN: '27AAPFU0939F1ZV',
  supplierName: 'Electronics Retail Store',
  supplierAddress: 'Mumbai, Maharashtra',
  supplierState: '27',

  // B2C - No GSTIN required
  customerName: 'Walk-in Customer',
  customerAddress: 'Mumbai, Maharashtra',
  customerState: '27',

  lineItems: [
    {
      serialNo: 1,
      description: 'Samsung Galaxy Phone',
      hsnSac: '85171200',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 25000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: false
    },
    {
      serialNo: 2,
      description: 'Phone Case',
      hsnSac: '39269099',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 500,
      discount: 50,
      gstRate: 18,
      cessRate: 0,
      isService: false
    }
  ],

  reverseCharge: false
}

const b2cCalc = GSTCalculator.calculateInvoiceTax(b2cInvoice)

console.log('Invoice Number:', b2cInvoice.invoiceNumber)
console.log('Transaction Type: B2C (Retail)')
console.log('\nInvoice Breakdown:')
console.log('  Taxable Amount: ₹' + b2cCalc.totals.taxableAmount)
console.log('  CGST (9%): ₹' + b2cCalc.totals.totalCGST)
console.log('  SGST (9%): ₹' + b2cCalc.totals.totalSGST)
console.log('  Total Amount: ₹' + b2cCalc.totals.totalInvoiceAmount)
console.log()

// Example 2.3: Export Invoice (Zero-rated)
console.log('2.3 Export Invoice (Zero-rated)')

const exportInvoice: GSTInvoice = {
  invoiceNumber: 'EXP-2024-005',
  invoiceDate: new Date('2024-03-25'),
  invoiceType: GSTInvoiceType.EXPORT_INVOICE,
  transactionType: GSTTransactionType.EXPORT,
  placeOfSupply: '96', // Foreign country

  supplierGSTIN: '27AAPFU0939F1ZV',
  supplierName: 'Export House India Ltd',
  supplierAddress: 'Mumbai, Maharashtra',
  supplierState: '27',

  customerName: 'ABC Corp USA',
  customerAddress: 'New York, USA',
  customerState: '96', // Foreign

  lineItems: [
    {
      serialNo: 1,
      description: 'Handicraft Items',
      hsnSac: '44209090',
      quantity: 100,
      unit: 'PCS',
      unitPrice: 500,
      discount: 0,
      gstRate: 0, // Zero-rated for exports
      cessRate: 0,
      isService: false
    }
  ],

  reverseCharge: false,
  notes: 'Export with payment of tax (refund will be claimed)'
}

const exportCalc = GSTCalculator.calculateInvoiceTax(exportInvoice)

console.log('Invoice Number:', exportInvoice.invoiceNumber)
console.log('Transaction Type: Export')
console.log('\nInvoice Breakdown:')
console.log('  Taxable Amount: ₹' + exportCalc.totals.taxableAmount)
console.log('  IGST: ₹' + exportCalc.totals.totalIGST + ' (Zero-rated)')
console.log('  Total Amount: ₹' + exportCalc.totals.totalInvoiceAmount)
console.log()

// Example 2.4: Invoice with Mixed Tax Rates
console.log('2.4 Invoice with Mixed Tax Rates (Restaurant Bill)')

const restaurantInvoice: GSTInvoice = {
  invoiceNumber: 'REST-2024-123',
  invoiceDate: new Date('2024-03-28'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2C,
  placeOfSupply: '07',

  supplierGSTIN: '07CCCCC5678D1Z9',
  supplierName: 'Fine Dining Restaurant',
  supplierAddress: 'Connaught Place, Delhi',
  supplierState: '07',

  customerName: 'Dine-in Customer',
  customerAddress: 'Delhi',
  customerState: '07',

  lineItems: [
    {
      serialNo: 1,
      description: 'Food Items',
      hsnSac: '996331',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 1500,
      discount: 0,
      gstRate: 5,
      cessRate: 0,
      isService: true
    },
    {
      serialNo: 2,
      description: 'Beverages (Non-alcoholic)',
      hsnSac: '996331',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 500,
      discount: 0,
      gstRate: 5,
      cessRate: 0,
      isService: true
    },
    {
      serialNo: 3,
      description: 'Service Charge (Restaurant)',
      hsnSac: '996331',
      quantity: 1,
      unit: 'NOS',
      unitPrice: 200,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: true
    }
  ],

  reverseCharge: false
}

const restaurantCalc = GSTCalculator.calculateInvoiceTax(restaurantInvoice)

console.log('Invoice Number:', restaurantInvoice.invoiceNumber)
console.log('\nLine Items with Different Rates:')
restaurantCalc.lineItemCalculations.forEach((item, index) => {
  const lineItem = restaurantInvoice.lineItems[index]
  console.log(`  ${lineItem.description}: ₹${lineItem.unitPrice} + ${lineItem.gstRate}% GST = ₹${item.totalAmount}`)
})

console.log('\nTotals:')
console.log('  Taxable Amount: ₹' + restaurantCalc.totals.taxableAmount)
console.log('  CGST: ₹' + restaurantCalc.totals.totalCGST)
console.log('  SGST: ₹' + restaurantCalc.totals.totalSGST)
console.log('  Total Bill: ₹' + restaurantCalc.totals.totalInvoiceAmount)

console.log('\n=== End of Example 2 ===')
