/**
 * Example 5: Complete GST Workflow
 *
 * This example demonstrates a complete end-to-end workflow:
 * 1. Validating business details
 * 2. Creating and calculating invoices
 * 3. Generating GSTR-1
 * 4. Generating GSTR-3B
 * 5. Exporting for portal upload
 */

import {
  GST,
  GSTCalculator,
  GSTReturnGenerator,
  GSTInvoice,
  GSTInvoiceType,
  GSTTransactionType,
  GSTINValidator,
  HSNValidator
} from '../src/index'
import { writeFileSync } from 'fs'

console.log('=== Complete GST Compliance Workflow ===\n')

// Step 1: Validate Business Details
console.log('STEP 1: Validating Business Details')
console.log('=====================================')

const myGSTIN = '27AAPFU0939F1ZV'
const customerGSTIN = '29BBBBB1234C1Z5'

// Validate GSTINs
console.log('\nValidating GSTINs...')
const myGSTINValid = GSTINValidator.validate(myGSTIN)
const customerGSTINValid = GSTINValidator.validate(customerGSTIN)

console.log(`  My GSTIN (${myGSTIN}): ${myGSTINValid ? '✓ Valid' : '✗ Invalid'}`)
console.log(`  Customer GSTIN (${customerGSTIN}): ${customerGSTINValid ? '✓ Valid' : '✗ Invalid'}`)

// Extract GSTIN details
const myGSTINInfo = GSTINValidator.extract(myGSTIN)
const customerGSTINInfo = GSTINValidator.extract(customerGSTIN)

console.log('\n  My Business:')
console.log(`    State: ${myGSTINInfo.stateName} (Code: ${myGSTINInfo.stateCode})`)
console.log(`    PAN: ${myGSTINInfo.pan}`)

console.log('\n  Customer:')
console.log(`    State: ${customerGSTINInfo.stateName} (Code: ${customerGSTINInfo.stateCode})`)
console.log(`    PAN: ${customerGSTINInfo.pan}`)

// Check if inter-state
const isInterState = !GST.isIntraState(myGSTINInfo.stateCode, customerGSTINInfo.stateCode)
console.log(`\n  Transaction Type: ${isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST + SGST)'}`)

// Step 2: Create and Calculate Invoices
console.log('\n\nSTEP 2: Creating and Calculating Invoices')
console.log('==========================================')

const invoices: GSTInvoice[] = []
let totalSales = 0
let totalTax = 0

// Invoice 1: Software Services
console.log('\nInvoice 1: Software Development Services')
const invoice1: GSTInvoice = {
  invoiceNumber: 'INV/2024/001',
  invoiceDate: new Date('2024-03-05'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2B,
  placeOfSupply: customerGSTINInfo.stateCode,

  supplierGSTIN: myGSTIN,
  supplierName: 'Tech Solutions Pvt Ltd',
  supplierAddress: 'Mumbai, Maharashtra',
  supplierState: myGSTINInfo.stateCode,

  customerGSTIN: customerGSTIN,
  customerName: 'Business Corp Ltd',
  customerAddress: 'Bangalore, Karnataka',
  customerState: customerGSTINInfo.stateCode,

  lineItems: [
    {
      serialNo: 1,
      description: 'Custom Software Development',
      hsnSac: '998314',
      quantity: 1,
      unit: 'MAN',
      unitPrice: 500000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: true
    },
    {
      serialNo: 2,
      description: 'Technical Support (Annual)',
      hsnSac: '998315',
      quantity: 1,
      unit: 'YR',
      unitPrice: 100000,
      discount: 10000,
      gstRate: 18,
      cessRate: 0,
      isService: true
    }
  ],

  reverseCharge: false,
  notes: 'Payment Terms: Net 30 days'
}

const invoice1Calc = GSTCalculator.calculateInvoiceTax(invoice1)
invoices.push(invoice1)
totalSales += invoice1Calc.totals.taxableAmount
totalTax += invoice1Calc.totals.totalTax

console.log(`  Invoice Number: ${invoice1.invoiceNumber}`)
console.log(`  Customer: ${invoice1.customerName}`)
console.log(`  Taxable Amount: ₹${invoice1Calc.totals.taxableAmount.toLocaleString('en-IN')}`)
console.log(`  IGST (18%): ₹${invoice1Calc.totals.totalIGST.toLocaleString('en-IN')}`)
console.log(`  Total Amount: ₹${invoice1Calc.totals.totalInvoiceAmount.toLocaleString('en-IN')}`)

// Invoice 2: Product Sale
console.log('\nInvoice 2: Hardware Equipment')
const invoice2: GSTInvoice = {
  invoiceNumber: 'INV/2024/002',
  invoiceDate: new Date('2024-03-10'),
  invoiceType: GSTInvoiceType.TAX_INVOICE,
  transactionType: GSTTransactionType.B2B,
  placeOfSupply: customerGSTINInfo.stateCode,

  supplierGSTIN: myGSTIN,
  supplierName: 'Tech Solutions Pvt Ltd',
  supplierAddress: 'Mumbai, Maharashtra',
  supplierState: myGSTINInfo.stateCode,

  customerGSTIN: customerGSTIN,
  customerName: 'Business Corp Ltd',
  customerAddress: 'Bangalore, Karnataka',
  customerState: customerGSTINInfo.stateCode,

  lineItems: [
    {
      serialNo: 1,
      description: 'Dell Latitude Laptops',
      hsnSac: '84713000',
      quantity: 10,
      unit: 'NOS',
      unitPrice: 60000,
      discount: 30000,
      gstRate: 18,
      cessRate: 0,
      isService: false
    },
    {
      serialNo: 2,
      description: 'Network Switches',
      hsnSac: '85176290',
      quantity: 5,
      unit: 'NOS',
      unitPrice: 20000,
      discount: 0,
      gstRate: 18,
      cessRate: 0,
      isService: false
    }
  ],

  reverseCharge: false
}

const invoice2Calc = GSTCalculator.calculateInvoiceTax(invoice2)
invoices.push(invoice2)
totalSales += invoice2Calc.totals.taxableAmount
totalTax += invoice2Calc.totals.totalTax

console.log(`  Invoice Number: ${invoice2.invoiceNumber}`)
console.log(`  Customer: ${invoice2.customerName}`)
console.log(`  Taxable Amount: ₹${invoice2Calc.totals.taxableAmount.toLocaleString('en-IN')}`)
console.log(`  IGST (18%): ₹${invoice2Calc.totals.totalIGST.toLocaleString('en-IN')}`)
console.log(`  Total Amount: ₹${invoice2Calc.totals.totalInvoiceAmount.toLocaleString('en-IN')}`)

console.log('\n  Period Summary:')
console.log(`    Total Invoices: ${invoices.length}`)
console.log(`    Total Taxable Sales: ₹${totalSales.toLocaleString('en-IN')}`)
console.log(`    Total Tax Collected: ₹${totalTax.toLocaleString('en-IN')}`)
console.log(`    Total Revenue: ₹${(totalSales + totalTax).toLocaleString('en-IN')}`)

// Step 3: Generate GSTR-1
console.log('\n\nSTEP 3: Generating GSTR-1 Return')
console.log('=================================')

const period = '032024' // March 2024

console.log(`\nGenerating GSTR-1 for period ${period}...`)
const gstr1 = GSTReturnGenerator.generateGSTR1(myGSTIN, period, invoices)

console.log('\nGSTR-1 Summary:')
console.log(`  B2B Customers: ${gstr1.b2b.length}`)
console.log(`  B2B Invoices: ${gstr1.b2b.reduce((sum, entry) => sum + entry.inv.length, 0)}`)
console.log(`  HSN/SAC Codes: ${gstr1.hsn.length}`)

// Validate GSTR-1
const gstr1Validation = GSTReturnGenerator.validateGSTR1(gstr1)
console.log(`\nValidation: ${gstr1Validation.isValid ? '✓ Passed' : '✗ Failed'}`)
if (!gstr1Validation.isValid) {
  gstr1Validation.errors.forEach(error => console.log(`  - ${error}`))
}

// Export GSTR-1
const gstr1JSON = GSTReturnGenerator.exportGSTR1JSON(gstr1)
const gstr1Filename = `GSTR1_${period}_${myGSTIN}.json`
writeFileSync(gstr1Filename, gstr1JSON)
console.log(`\n✓ GSTR-1 exported to: ${gstr1Filename}`)

// Step 4: Generate GSTR-3B
console.log('\n\nSTEP 4: Generating GSTR-3B Return')
console.log('==================================')

// For this example, we'll assume some purchase data
const purchases = {
  taxable: 400000,
  igst: 50000,
  cgst: 10000,
  sgst: 10000
}

console.log('\nInput Data:')
console.log('  Outward Supplies (from GSTR-1):')
console.log(`    Taxable: ₹${totalSales.toLocaleString('en-IN')}`)
console.log(`    Tax: ₹${totalTax.toLocaleString('en-IN')}`)

console.log('\n  Purchases (Input Tax Credit):')
console.log(`    Taxable: ₹${purchases.taxable.toLocaleString('en-IN')}`)
console.log(`    ITC Available: ₹${(purchases.igst + purchases.cgst + purchases.sgst).toLocaleString('en-IN')}`)

const gstr3b = GSTReturnGenerator.generateGSTR3B(
  myGSTIN,
  period,
  {
    taxable: totalSales,
    igst: totalTax,
    cgst: 0,
    sgst: 0,
    cess: 0
  },
  {
    reverseCharge: {
      taxable: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0
    }
  },
  {
    available: purchases,
    reversed: {
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0
    }
  }
)

// Calculate tax liability
const taxLiability = totalTax - (purchases.igst + purchases.cgst + purchases.sgst)

console.log('\n  Tax Liability:')
console.log(`    Tax on Outward Supplies: ₹${totalTax.toLocaleString('en-IN')}`)
console.log(`    Less: ITC Claimed: ₹${(purchases.igst + purchases.cgst + purchases.sgst).toLocaleString('en-IN')}`)
console.log(`    Net Tax Payable: ₹${taxLiability.toLocaleString('en-IN')}`)

// Validate GSTR-3B
const gstr3bValidation = GSTReturnGenerator.validateGSTR3B(gstr3b)
console.log(`\nValidation: ${gstr3bValidation.isValid ? '✓ Passed' : '✗ Failed'}`)
if (!gstr3bValidation.isValid) {
  gstr3bValidation.errors.forEach(error => console.log(`  - ${error}`))
}

// Export GSTR-3B
const gstr3bJSON = GSTReturnGenerator.exportGSTR3BJSON(gstr3b)
const gstr3bFilename = `GSTR3B_${period}_${myGSTIN}.json`
writeFileSync(gstr3bFilename, gstr3bJSON)
console.log(`\n✓ GSTR-3B exported to: ${gstr3bFilename}`)

// Step 5: Summary and Next Steps
console.log('\n\nSTEP 5: Summary and Next Steps')
console.log('===============================')

console.log('\n✓ Workflow Complete!')
console.log('\nFiles Generated:')
console.log(`  1. ${gstr1Filename} - Upload to GSTR-1`)
console.log(`  2. ${gstr3bFilename} - Upload to GSTR-3B`)

console.log('\nNext Steps:')
console.log('  1. Review the generated JSON files')
console.log('  2. Login to GST Portal (https://www.gst.gov.in/)')
console.log('  3. Navigate to Returns > Returns Dashboard')
console.log('  4. Upload GSTR-1 JSON (Due: 11th of next month)')
console.log('  5. Upload GSTR-3B JSON (Due: 20th of next month)')
console.log('  6. Pay any tax liability via PMT-06 challan')
console.log('  7. File returns with DSC/EVC')

console.log('\nImportant Reminders:')
console.log('  - Ensure all invoices are accurate before filing')
console.log('  - Verify ITC claims with GSTR-2A/2B')
console.log('  - Make tax payment before filing GSTR-3B')
console.log('  - Late filing attracts late fees and interest')
console.log('  - Keep records for audit purposes')

console.log('\nCompliance Status:')
console.log(`  Period: March 2024`)
console.log(`  Total Sales: ₹${totalSales.toLocaleString('en-IN')}`)
console.log(`  Tax Collected: ₹${totalTax.toLocaleString('en-IN')}`)
console.log(`  Tax Payable: ₹${taxLiability.toLocaleString('en-IN')}`)
console.log(`  GSTR-1 Status: Ready for filing`)
console.log(`  GSTR-3B Status: Ready for filing`)

console.log('\n=== End of Complete Workflow ===')
