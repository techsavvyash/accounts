/**
 * Example 4: GSTR-3B Return Generation
 *
 * This example demonstrates how to generate GSTR-3B summary return
 * for a tax period.
 */

import { GSTReturnGenerator } from '../src/index'
import { writeFileSync } from 'fs'

console.log('=== Example 4: GSTR-3B Return Generation ===\n')

/**
 * GSTR-3B is a summary return where taxpayer declares:
 * 1. Outward supplies (from GSTR-1)
 * 2. Input Tax Credit (ITC) claimed
 * 3. Tax liability and payment
 *
 * This data is typically aggregated from:
 * - GSTR-1 (outward supplies)
 * - Purchase records (for ITC)
 * - Payment records
 */

// Example data for March 2024
const gstin = '27AAPFU0939F1ZV'
const period = '032024' // March 2024

console.log('Generating GSTR-3B for:')
console.log(`  GSTIN: ${gstin}`)
console.log(`  Period: ${period}\n`)

// Data from outward supplies (typically from GSTR-1)
const outwardSupplies = {
  taxable: 1500000, // Total taxable value
  igst: 180000, // IGST on inter-state supplies
  cgst: 45000, // CGST on intra-state supplies
  sgst: 45000, // SGST on intra-state supplies
  cess: 0 // Any cess applicable
}

console.log('1. Outward Supplies (from GSTR-1):')
console.log(`   Taxable Value: ₹${outwardSupplies.taxable.toLocaleString('en-IN')}`)
console.log(`   IGST: ₹${outwardSupplies.igst.toLocaleString('en-IN')}`)
console.log(`   CGST: ₹${outwardSupplies.cgst.toLocaleString('en-IN')}`)
console.log(`   SGST: ₹${outwardSupplies.sgst.toLocaleString('en-IN')}`)
console.log(`   Total Tax: ₹${(outwardSupplies.igst + outwardSupplies.cgst + outwardSupplies.sgst).toLocaleString('en-IN')}`)
console.log()

// Data from inward supplies liable to reverse charge
const inwardSupplies = {
  reverseCharge: {
    taxable: 100000, // Purchases from unregistered dealers
    igst: 18000,
    cgst: 0,
    sgst: 0,
    cess: 0
  }
}

console.log('2. Inward Supplies (Reverse Charge):')
console.log(`   Taxable Value: ₹${inwardSupplies.reverseCharge.taxable.toLocaleString('en-IN')}`)
console.log(`   IGST: ₹${inwardSupplies.reverseCharge.igst.toLocaleString('en-IN')}`)
console.log()

// Input Tax Credit (ITC) data
const itcData = {
  // ITC Available (from purchase invoices)
  available: {
    igst: 150000, // ITC on IGST
    cgst: 35000, // ITC on CGST
    sgst: 35000, // ITC on SGST
    cess: 0
  },
  // ITC Reversed (as per rules)
  reversed: {
    igst: 5000, // ITC reversed
    cgst: 1000,
    sgst: 1000,
    cess: 0
  }
}

console.log('3. Input Tax Credit (ITC):')
console.log('   ITC Available:')
console.log(`     IGST: ₹${itcData.available.igst.toLocaleString('en-IN')}`)
console.log(`     CGST: ₹${itcData.available.cgst.toLocaleString('en-IN')}`)
console.log(`     SGST: ₹${itcData.available.sgst.toLocaleString('en-IN')}`)
console.log(`     Total: ₹${(itcData.available.igst + itcData.available.cgst + itcData.available.sgst).toLocaleString('en-IN')}`)

console.log('\n   ITC Reversed:')
console.log(`     IGST: ₹${itcData.reversed.igst.toLocaleString('en-IN')}`)
console.log(`     CGST: ₹${itcData.reversed.cgst.toLocaleString('en-IN')}`)
console.log(`     SGST: ₹${itcData.reversed.sgst.toLocaleString('en-IN')}`)
console.log(`     Total: ₹${(itcData.reversed.igst + itcData.reversed.cgst + itcData.reversed.sgst).toLocaleString('en-IN')}`)

const netITC = {
  igst: itcData.available.igst - itcData.reversed.igst,
  cgst: itcData.available.cgst - itcData.reversed.cgst,
  sgst: itcData.available.sgst - itcData.reversed.sgst
}

console.log('\n   Net ITC:')
console.log(`     IGST: ₹${netITC.igst.toLocaleString('en-IN')}`)
console.log(`     CGST: ₹${netITC.cgst.toLocaleString('en-IN')}`)
console.log(`     SGST: ₹${netITC.sgst.toLocaleString('en-IN')}`)
console.log(`     Total: ₹${(netITC.igst + netITC.cgst + netITC.sgst).toLocaleString('en-IN')}`)
console.log()

// Calculate tax liability (tax on outward supplies - ITC)
const taxLiability = {
  igst: outwardSupplies.igst + inwardSupplies.reverseCharge.igst - netITC.igst,
  cgst: outwardSupplies.cgst - netITC.cgst,
  sgst: outwardSupplies.sgst - netITC.sgst
}

console.log('4. Tax Liability (Tax on supplies - Net ITC):')
console.log(`   IGST Payable: ₹${taxLiability.igst.toLocaleString('en-IN')}`)
console.log(`   CGST Payable: ₹${taxLiability.cgst.toLocaleString('en-IN')}`)
console.log(`   SGST Payable: ₹${taxLiability.sgst.toLocaleString('en-IN')}`)
console.log(`   Total Tax Payable: ₹${(taxLiability.igst + taxLiability.cgst + taxLiability.sgst).toLocaleString('en-IN')}`)
console.log()

// Generate GSTR-3B
console.log('Generating GSTR-3B return...')
const gstr3b = GSTReturnGenerator.generateGSTR3B(
  gstin,
  period,
  outwardSupplies,
  inwardSupplies,
  itcData
)

console.log('✓ GSTR-3B generated successfully\n')

// Display GSTR-3B structure
console.log('GSTR-3B Structure:')
console.log('==================')
console.log(`GSTIN: ${gstr3b.gstin}`)
console.log(`Return Period: ${gstr3b.ret_period}`)
console.log()

console.log('Table 3.1 - Outward and Inward Supplies:')
console.log('  (a) Outward taxable supplies:')
console.log(`      Taxable Value: ₹${gstr3b.sup_details.osup_det.txval}`)
console.log(`      IGST: ₹${gstr3b.sup_details.osup_det.iamt}`)
console.log(`      CGST: ₹${gstr3b.sup_details.osup_det.camt}`)
console.log(`      SGST: ₹${gstr3b.sup_details.osup_det.samt}`)

console.log('\n  (d) Inward supplies (reverse charge):')
console.log(`      Taxable Value: ₹${gstr3b.sup_details.isup_rev.txval}`)
console.log(`      IGST: ₹${gstr3b.sup_details.isup_rev.iamt}`)
console.log()

console.log('Table 4 - Eligible ITC:')
console.log('  (A) ITC Available:')
console.log(`      IGST: ₹${gstr3b.itc_elg.itc_avl[0].iamt}`)
console.log(`      CGST: ₹${gstr3b.itc_elg.itc_avl[0].camt}`)
console.log(`      SGST: ₹${gstr3b.itc_elg.itc_avl[0].samt}`)

console.log('\n  (B) ITC Reversed:')
console.log(`      IGST: ₹${gstr3b.itc_elg.itc_rev[0].iamt}`)
console.log(`      CGST: ₹${gstr3b.itc_elg.itc_rev[0].camt}`)
console.log(`      SGST: ₹${gstr3b.itc_elg.itc_rev[0].samt}`)

console.log('\n  (C) Net ITC Available:')
console.log(`      IGST: ₹${gstr3b.itc_elg.itc_net.iamt}`)
console.log(`      CGST: ₹${gstr3b.itc_elg.itc_net.camt}`)
console.log(`      SGST: ₹${gstr3b.itc_elg.itc_net.samt}`)
console.log()

// Validate GSTR-3B
console.log('Validating GSTR-3B...')
const validation = GSTReturnGenerator.validateGSTR3B(gstr3b)

if (validation.isValid) {
  console.log('✓ GSTR-3B validation successful!')
} else {
  console.log('✗ GSTR-3B validation failed:')
  validation.errors.forEach(error => {
    console.log(`  - ${error}`)
  })
}
console.log()

// Export as JSON
console.log('Exporting GSTR-3B as JSON...')
const jsonString = GSTReturnGenerator.exportGSTR3BJSON(gstr3b)

// Save to file
const filename = `GSTR3B_${gstr3b.ret_period}_${gstr3b.gstin}.json`
try {
  writeFileSync(filename, jsonString)
  console.log(`✓ GSTR-3B JSON saved to: ${filename}`)
  console.log(`  File size: ${(jsonString.length / 1024).toFixed(2)} KB`)
  console.log()
  console.log('You can now upload this JSON file to the GST portal:')
  console.log('  1. Login to https://www.gst.gov.in/')
  console.log('  2. Go to Services > Returns > Returns Dashboard')
  console.log('  3. Select GSTR-3B for the tax period')
  console.log('  4. Click "PREPARE OFFLINE"')
  console.log('  5. Click "UPLOAD" and select this JSON file')
  console.log()
  console.log('Important Notes:')
  console.log('  - GSTR-3B must be filed by 20th of next month')
  console.log('  - Ensure tax payment is made before filing')
  console.log('  - Late filing attracts late fees and interest')
  console.log('  - This is a summary return; details are in GSTR-1')
} catch (error) {
  console.error('Error saving file:', error)
}

console.log('\n=== End of Example 4 ===')
