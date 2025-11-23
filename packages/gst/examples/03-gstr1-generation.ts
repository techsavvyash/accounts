/**
 * Example 3: GSTR-1 Return Generation
 *
 * This example demonstrates how to generate GSTR-1 return
 * for a tax period with various types of transactions.
 */

import {
  GST,
  GSTReturnGenerator,
  GSTInvoice,
  GSTInvoiceType,
  GSTTransactionType
} from '../src/index'
import { writeFileSync } from 'fs'

console.log('=== Example 3: GSTR-1 Return Generation ===\n')

// Sample invoices for March 2024
const invoices: GSTInvoice[] = [
  // B2B Invoice 1
  {
    invoiceNumber: 'INV/24-25/001',
    invoiceDate: new Date('2024-03-05'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2B,
    placeOfSupply: '29',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerGSTIN: '29BBBBB1234C1Z5',
    customerName: 'XYZ Enterprises Ltd',
    customerAddress: 'Bangalore, Karnataka',
    customerState: '29',

    lineItems: [
      {
        serialNo: 1,
        description: 'Software Development Services',
        hsnSac: '998314',
        quantity: 1,
        unit: 'MAN',
        unitPrice: 500000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: true
      }
    ],

    reverseCharge: false
  },

  // B2B Invoice 2 (Same customer, different invoice)
  {
    invoiceNumber: 'INV/24-25/002',
    invoiceDate: new Date('2024-03-12'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2B,
    placeOfSupply: '29',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerGSTIN: '29BBBBB1234C1Z5',
    customerName: 'XYZ Enterprises Ltd',
    customerAddress: 'Bangalore, Karnataka',
    customerState: '29',

    lineItems: [
      {
        serialNo: 1,
        description: 'Cloud Services',
        hsnSac: '998315',
        quantity: 3,
        unit: 'MAN',
        unitPrice: 100000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: true
      }
    ],

    reverseCharge: false
  },

  // B2B Invoice 3 (Different customer)
  {
    invoiceNumber: 'INV/24-25/003',
    invoiceDate: new Date('2024-03-15'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2B,
    placeOfSupply: '07',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerGSTIN: '07DDDDD4321E1Z7',
    customerName: 'Delhi Corp Ltd',
    customerAddress: 'New Delhi',
    customerState: '07',

    lineItems: [
      {
        serialNo: 1,
        description: 'Hardware Equipment',
        hsnSac: '84713000',
        quantity: 10,
        unit: 'NOS',
        unitPrice: 50000,
        discount: 25000,
        gstRate: 18,
        cessRate: 0,
        isService: false
      }
    ],

    reverseCharge: false
  },

  // B2CL Invoice (Large invoice to unregistered customer, inter-state)
  {
    invoiceNumber: 'INV/24-25/004',
    invoiceDate: new Date('2024-03-18'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2CL,
    placeOfSupply: '33',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerName: 'Individual Customer',
    customerAddress: 'Chennai, Tamil Nadu',
    customerState: '33',

    lineItems: [
      {
        serialNo: 1,
        description: 'High-end Laptop',
        hsnSac: '84713000',
        quantity: 1,
        unit: 'NOS',
        unitPrice: 300000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: false
      }
    ],

    reverseCharge: false
  },

  // B2CS Invoices (Small invoices to unregistered customers)
  {
    invoiceNumber: 'INV/24-25/005',
    invoiceDate: new Date('2024-03-20'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2C,
    placeOfSupply: '27',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerName: 'Walk-in Customer 1',
    customerAddress: 'Mumbai, Maharashtra',
    customerState: '27',

    lineItems: [
      {
        serialNo: 1,
        description: 'Accessories',
        hsnSac: '85176290',
        quantity: 5,
        unit: 'NOS',
        unitPrice: 2000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: false
      }
    ],

    reverseCharge: false
  },

  {
    invoiceNumber: 'INV/24-25/006',
    invoiceDate: new Date('2024-03-22'),
    invoiceType: GSTInvoiceType.TAX_INVOICE,
    transactionType: GSTTransactionType.B2C,
    placeOfSupply: '27',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerName: 'Walk-in Customer 2',
    customerAddress: 'Mumbai, Maharashtra',
    customerState: '27',

    lineItems: [
      {
        serialNo: 1,
        description: 'Software License',
        hsnSac: '998313',
        quantity: 2,
        unit: 'NOS',
        unitPrice: 5000,
        discount: 0,
        gstRate: 18,
        cessRate: 0,
        isService: true
      }
    ],

    reverseCharge: false
  },

  // Export Invoice
  {
    invoiceNumber: 'EXP/24-25/001',
    invoiceDate: new Date('2024-03-25'),
    invoiceType: GSTInvoiceType.EXPORT_INVOICE,
    transactionType: GSTTransactionType.EXPORT,
    placeOfSupply: '96',

    supplierGSTIN: '27AAPFU0939F1ZV',
    supplierName: 'ABC Technologies Pvt Ltd',
    supplierAddress: 'Mumbai, Maharashtra',
    supplierState: '27',

    customerName: 'Global Tech Inc',
    customerAddress: 'San Francisco, USA',
    customerState: '96',

    lineItems: [
      {
        serialNo: 1,
        description: 'IT Services',
        hsnSac: '998314',
        quantity: 1,
        unit: 'MAN',
        unitPrice: 200000,
        discount: 0,
        gstRate: 0, // Export - zero rated
        cessRate: 0,
        isService: true
      }
    ],

    reverseCharge: false
  }
]

console.log(`Generating GSTR-1 for March 2024 with ${invoices.length} invoices...\n`)

// Generate GSTR-1
const gstr1 = GSTReturnGenerator.generateGSTR1(
  '27AAPFU0939F1ZV',
  '032024', // March 2024
  invoices
)

console.log('GSTR-1 Summary:')
console.log('===============')
console.log(`GSTIN: ${gstr1.gstin}`)
console.log(`Return Period: ${gstr1.ret_period}`)
console.log()

// B2B Summary
console.log('B2B Supplies (Business to Business):')
console.log(`  Total Customers: ${gstr1.b2b.length}`)
let totalB2BInvoices = 0
let totalB2BValue = 0
gstr1.b2b.forEach(entry => {
  totalB2BInvoices += entry.inv.length
  entry.inv.forEach(inv => {
    totalB2BValue += inv.val
    console.log(`    Customer GSTIN: ${entry.ctin}`)
    console.log(`      Invoice: ${inv.inum}, Date: ${inv.idt}, Value: ₹${inv.val}`)
  })
})
console.log(`  Total B2B Invoices: ${totalB2BInvoices}`)
console.log(`  Total B2B Value: ₹${totalB2BValue.toFixed(2)}`)
console.log()

// B2CL Summary
console.log('B2CL Supplies (Large invoices to unregistered, inter-state):')
console.log(`  Total States: ${gstr1.b2cl.length}`)
let totalB2CLInvoices = 0
let totalB2CLValue = 0
gstr1.b2cl.forEach(entry => {
  totalB2CLInvoices += entry.inv.length
  entry.inv.forEach(inv => {
    totalB2CLValue += inv.val
    console.log(`    Place of Supply: ${entry.pos}`)
    console.log(`      Invoice: ${inv.inum}, Date: ${inv.idt}, Value: ₹${inv.val}`)
  })
})
console.log(`  Total B2CL Invoices: ${totalB2CLInvoices}`)
console.log(`  Total B2CL Value: ₹${totalB2CLValue.toFixed(2)}`)
console.log()

// B2CS Summary
console.log('B2CS Supplies (Small invoices to unregistered):')
console.log(`  Total Entries: ${gstr1.b2cs.length}`)
let totalB2CSValue = 0
gstr1.b2cs.forEach(entry => {
  totalB2CSValue += entry.txval
  console.log(`    Type: ${entry.sply_ty}, POS: ${entry.pos}, Rate: ${entry.rt}%`)
  console.log(`      Taxable Value: ₹${entry.txval}, IGST: ₹${entry.iamt}`)
})
console.log(`  Total B2CS Value: ₹${totalB2CSValue.toFixed(2)}`)
console.log()

// Export Summary
console.log('Export Supplies:')
console.log(`  Total Export Types: ${gstr1.exp.length}`)
let totalExportValue = 0
gstr1.exp.forEach(entry => {
  console.log(`    Export Type: ${entry.exp_typ}`)
  entry.inv.forEach(inv => {
    totalExportValue += inv.val
    console.log(`      Invoice: ${inv.inum}, Date: ${inv.idt}, Value: ₹${inv.val}`)
  })
})
console.log(`  Total Export Value: ₹${totalExportValue.toFixed(2)}`)
console.log()

// HSN Summary
console.log('HSN Summary:')
console.log(`  Total HSN/SAC Codes: ${gstr1.hsn.length}`)
gstr1.hsn.forEach(entry => {
  console.log(`    HSN/SAC: ${entry.hsn_sc} - ${entry.desc}`)
  console.log(`      Qty: ${entry.qty} ${entry.uqc}, Value: ₹${entry.val}`)
  console.log(`      Tax: IGST ₹${entry.iamt}, CGST ₹${entry.camt}, SGST ₹${entry.samt}`)
})
console.log()

// Validate GSTR-1
console.log('Validating GSTR-1...')
const validation = GSTReturnGenerator.validateGSTR1(gstr1)

if (validation.isValid) {
  console.log('✓ GSTR-1 validation successful!')
} else {
  console.log('✗ GSTR-1 validation failed:')
  validation.errors.forEach(error => {
    console.log(`  - ${error}`)
  })
}
console.log()

// Export as JSON
console.log('Exporting GSTR-1 as JSON...')
const jsonString = GSTReturnGenerator.exportGSTR1JSON(gstr1)

// Save to file
const filename = `GSTR1_${gstr1.ret_period}_${gstr1.gstin}.json`
try {
  writeFileSync(filename, jsonString)
  console.log(`✓ GSTR-1 JSON saved to: ${filename}`)
  console.log(`  File size: ${(jsonString.length / 1024).toFixed(2)} KB`)
  console.log()
  console.log('You can now upload this JSON file to the GST portal:')
  console.log('  1. Login to https://www.gst.gov.in/')
  console.log('  2. Go to Services > Returns > Returns Dashboard')
  console.log('  3. Select GSTR-1 for the tax period')
  console.log('  4. Click "PREPARE OFFLINE"')
  console.log('  5. Click "UPLOAD" and select this JSON file')
} catch (error) {
  console.error('Error saving file:', error)
}

console.log('\n=== End of Example 3 ===')
