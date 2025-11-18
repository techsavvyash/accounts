/**
 * Example 1: Basic GST Calculation
 *
 * This example demonstrates how to perform basic GST calculations
 * for simple transactions.
 */

import { GST, GSTCalculator } from '../src/index'

console.log('=== Example 1: Basic GST Calculation ===\n')

// Example 1.1: Intra-state transaction (within Maharashtra)
console.log('1.1 Intra-state Transaction (Maharashtra -> Maharashtra)')
const intraStateCalc = GST.quickCalculate(
  10000, // base amount
  18, // GST rate (18%)
  '27', // supplier state (Maharashtra)
  '27', // customer state (Maharashtra)
)

console.log('Base Amount:', intraStateCalc.taxableAmount)
console.log('CGST (9%):', intraStateCalc.cgst)
console.log('SGST (9%):', intraStateCalc.sgst)
console.log('IGST:', intraStateCalc.igst)
console.log('Total Tax:', intraStateCalc.totalTax)
console.log('Total Amount:', intraStateCalc.totalAmount)
console.log()

// Example 1.2: Inter-state transaction (Maharashtra -> Karnataka)
console.log('1.2 Inter-state Transaction (Maharashtra -> Karnataka)')
const interStateCalc = GST.quickCalculate(
  10000, // base amount
  18, // GST rate (18%)
  '27', // supplier state (Maharashtra)
  '29', // customer state (Karnataka)
)

console.log('Base Amount:', interStateCalc.taxableAmount)
console.log('CGST:', interStateCalc.cgst)
console.log('SGST:', interStateCalc.sgst)
console.log('IGST (18%):', interStateCalc.igst)
console.log('Total Tax:', interStateCalc.totalTax)
console.log('Total Amount:', interStateCalc.totalAmount)
console.log()

// Example 1.3: Tax-inclusive calculation
console.log('1.3 Tax-Inclusive Calculation')
const inclusiveCalc = GST.quickCalculate(
  11800, // total amount (including GST)
  18,
  '27',
  '29',
  { isInclusive: true }
)

console.log('Total Amount (including GST):', inclusiveCalc.totalAmount)
console.log('Taxable Amount:', inclusiveCalc.taxableAmount)
console.log('IGST (18%):', inclusiveCalc.igst)
console.log()

// Example 1.4: Calculation with Cess
console.log('1.4 Calculation with Cess (e.g., Luxury Cars)')
const cessCalc = GST.quickCalculate(
  1000000, // 10 lakh car
  28, // GST rate (28%)
  '07', // supplier state (Delhi)
  '07', // customer state (Delhi)
  { cessRate: 22 } // Additional cess on luxury cars
)

console.log('Base Amount:', cessCalc.taxableAmount)
console.log('CGST (14%):', cessCalc.cgst)
console.log('SGST (14%):', cessCalc.sgst)
console.log('Cess (22%):', cessCalc.cess)
console.log('Total Tax:', cessCalc.totalTax)
console.log('Total Amount:', cessCalc.totalAmount)
console.log()

// Example 1.5: Reverse Charge Mechanism
console.log('1.5 Reverse Charge Calculation')
const reverseChargeCalc = GST.quickCalculate(
  50000,
  18,
  '29',
  '27',
  { applyReverseCharge: true }
)

console.log('Base Amount:', reverseChargeCalc.taxableAmount)
console.log('IGST (paid by recipient):', reverseChargeCalc.igst)
console.log('Total Amount:', reverseChargeCalc.totalAmount)
console.log()

// Example 1.6: Different GST Rates
console.log('1.6 Different GST Rates Examples')
const rates = [
  { rate: 0, item: 'Fresh Vegetables' },
  { rate: 5, item: 'Household Necessities' },
  { rate: 12, item: 'Processed Food' },
  { rate: 18, item: 'Electronics' },
  { rate: 28, item: 'Luxury Items' }
]

rates.forEach(({ rate, item }) => {
  const calc = GSTCalculator.calculateTax({
    amount: 1000,
    gstRate: rate,
    isInclusive: false,
    applyReverseCharge: false,
    isInterState: true,
    cessRate: 0
  })

  console.log(`${item} (${rate}% GST):`)
  console.log(`  Base: ₹${calc.taxableAmount}, Tax: ₹${calc.totalTax}, Total: ₹${calc.totalAmount}`)
})
console.log()

// Example 1.7: Batch Calculations
console.log('1.7 Batch Calculations for Multiple Items')
const items = [
  { amount: 50000, gstRate: 18, description: 'Laptop', hsnSac: '84713000' },
  { amount: 15000, gstRate: 18, description: 'Mobile Phone', hsnSac: '85171200' },
  { amount: 500, gstRate: 5, description: 'Book', hsnSac: '49011000' },
  { amount: 2000, gstRate: 12, description: 'Stationery', hsnSac: '48201000' }
]

const batchResults = GST.batchCalculate(items, '27', '29')

batchResults.forEach((result, index) => {
  console.log(`${items[index].description}:`)
  console.log(`  Taxable: ₹${result.taxableAmount}`)
  console.log(`  IGST: ₹${result.igst}`)
  console.log(`  Total: ₹${result.totalAmount}`)
})
console.log()

// Example 1.8: Reverse Calculation (finding base from total)
console.log('1.8 Reverse GST Calculation (Total -> Base)')
const reverseCalc = GSTCalculator.calculateReverseGST(11800, 18, true)

console.log('Total Amount (with GST):', reverseCalc.totalAmount)
console.log('Taxable Amount:', reverseCalc.taxableAmount)
console.log('GST Amount:', reverseCalc.totalTax)
console.log()

console.log('=== End of Example 1 ===')
