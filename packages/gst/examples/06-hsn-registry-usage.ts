/**
 * Example 6: HSN Registry Usage
 *
 * This example demonstrates how to use the comprehensive HSN Registry
 * to lookup HSN codes, search for products, and get GST rate recommendations.
 */

import { HSNRegistry, HSNValidator, GST } from '../src/index'

console.log('=== Example 6: HSN Registry Usage ===\n')

// Example 1: Get all HSN chapters
console.log('1. All HSN Chapters')
console.log('====================')
const chapters = HSNRegistry.getAllChapters()
console.log(`Total chapters: ${chapters.length}`)
console.log('\nFirst 10 chapters:')
chapters.slice(0, 10).forEach(ch => {
  console.log(`  ${ch.code}: ${ch.description} (Section ${ch.section})`)
})
console.log()

// Example 2: Get chapters by section
console.log('2. Chapters by Section')
console.log('=======================')
const section16Chapters = HSNRegistry.getChaptersBySection('XVI')
console.log('Section XVI - Machinery and Electrical Equipment:')
section16Chapters.forEach(ch => {
  console.log(`  ${ch.code}: ${ch.description}`)
})
console.log()

// Example 3: Lookup specific HSN codes
console.log('3. Lookup Specific HSN Codes')
console.log('==============================')

const hsnCodes = ['8471', '847130', '8517', '851712', '3401', '8703', '870323']

hsnCodes.forEach(code => {
  const info = HSNRegistry.lookup(code)
  console.log(`\nHSN: ${code}`)
  console.log(`  Description: ${info.description}`)
  if (info.chapterDescription && info.chapterDescription !== info.description) {
    console.log(`  Chapter: ${info.chapterDescription}`)
  }
  if (info.gstRate !== undefined) {
    console.log(`  GST Rate: ${info.gstRate}%`)
  }
  if (info.cess) {
    console.log(`  Cess: ${info.cess}%`)
  }
  if (info.unit) {
    console.log(`  Unit: ${info.unit}`)
  }
})
console.log()

// Example 4: Search HSN codes by description
console.log('4. Search HSN Codes by Description')
console.log('====================================')

const searchQueries = ['laptop', 'mobile', 'furniture', 'medicine']

searchQueries.forEach(query => {
  console.log(`\nSearch: "${query}"`)
  const results = HSNRegistry.searchByDescription(query)
  if (results.length > 0) {
    console.log(`  Found ${results.length} result(s):`)
    results.slice(0, 3).forEach(hsn => {
      console.log(`    - ${hsn.code}: ${hsn.description} (${hsn.gstRate}% GST)`)
    })
    if (results.length > 3) {
      console.log(`    ... and ${results.length - 3} more`)
    }
  } else {
    console.log(`  No results found`)
  }
})
console.log()

// Example 5: Get all HSN codes for a chapter
console.log('5. Get HSN Codes by Chapter')
console.log('=============================')

const chaptersToExplore = ['84', '87', '04']

chaptersToExplore.forEach(chapter => {
  const codes = HSNRegistry.getByChapter(chapter)
  const chapterInfo = HSNRegistry.getChapter(chapter)
  console.log(`\nChapter ${chapter}: ${chapterInfo?.description}`)
  console.log(`  Registered codes: ${codes.length}`)
  if (codes.length > 0) {
    codes.slice(0, 5).forEach(hsn => {
      console.log(`    - ${hsn.code}: ${hsn.description}`)
    })
    if (codes.length > 5) {
      console.log(`    ... and ${codes.length - 5} more`)
    }
  }
})
console.log()

// Example 6: Get HSN codes by GST rate
console.log('6. Get HSN Codes by GST Rate')
console.log('==============================')

const rates = [0, 5, 12, 18, 28]

rates.forEach(rate => {
  const codes = HSNRegistry.getByGSTRate(rate)
  console.log(`\n${rate}% GST Rate - ${codes.length} items`)
  if (codes.length > 0) {
    codes.slice(0, 3).forEach(hsn => {
      console.log(`  - ${hsn.code}: ${hsn.description}`)
    })
    if (codes.length > 3) {
      console.log(`  ... and ${codes.length - 3} more`)
    }
  }
})
console.log()

// Example 7: Get recommended GST rate for HSN
console.log('7. Get Recommended GST Rate')
console.log('=============================')

const testCodes = ['8471', '847130', '847141', '0701', '3004', '870323']

testCodes.forEach(code => {
  const rate = HSNRegistry.getRecommendedGSTRate(code)
  const info = HSNRegistry.lookup(code)
  console.log(`\nHSN ${code}:`)
  console.log(`  ${info.description}`)
  console.log(`  Recommended Rate: ${rate !== undefined ? rate + '%' : 'Not found'}`)
})
console.log()

// Example 8: Detailed HSN information
console.log('8. Detailed HSN Information')
console.log('=============================')

const detailedCode = '870323'
const details = HSNRegistry.getDetails(detailedCode)

console.log(`\nDetailed info for HSN ${detailedCode}:`)
if (details.chapter) {
  console.log(`  Chapter: ${details.chapter.code} - ${details.chapter.description}`)
  console.log(`  Section: ${details.chapter.section}`)
}
if (details.details) {
  console.log(`  Specific Item: ${details.details.description}`)
  console.log(`  GST Rate: ${details.details.gstRate}%`)
  if (details.details.cess) {
    console.log(`  Cess: ${details.details.cess}%`)
  }
  console.log(`  Unit: ${details.details.unit}`)
  if (details.details.notes) {
    console.log(`  Notes: ${details.details.notes}`)
  }
}
console.log(`  Recommended GST Rate: ${details.recommendedGSTRate}%`)
console.log()

// Example 9: Using HSN with GST calculations
console.log('9. Using HSN with GST Calculations')
console.log('====================================')

const products = [
  { name: 'Laptop Dell', hsn: '847130', price: 50000 },
  { name: 'Mobile Phone Samsung', hsn: '851712', price: 25000 },
  { name: 'Luxury Car', hsn: '870323', price: 2500000 },
  { name: 'Cheese', hsn: '0406', price: 500 }
]

products.forEach(product => {
  const hsnInfo = HSNRegistry.lookup(product.hsn)
  const gstRate = HSNRegistry.getRecommendedGSTRate(product.hsn) || 18

  const tax = GST.quickCalculate(
    product.price,
    gstRate,
    '27', // Maharashtra
    '29'  // Karnataka
  )

  console.log(`\n${product.name}`)
  console.log(`  HSN: ${product.hsn} - ${hsnInfo.description}`)
  console.log(`  Price: ₹${product.price.toLocaleString('en-IN')}`)
  console.log(`  GST Rate: ${gstRate}%${hsnInfo.cess ? ` + ${hsnInfo.cess}% cess` : ''}`)
  console.log(`  GST Amount: ₹${tax.igst.toLocaleString('en-IN')}`)
  console.log(`  Total: ₹${tax.totalAmount.toLocaleString('en-IN')}`)
})
console.log()

// Example 10: HSN Validation with detailed info
console.log('10. HSN Validation with Detailed Info')
console.log('=======================================')

const testHSNCodes = ['8471', '84713000', '999999', '12']

testHSNCodes.forEach(code => {
  try {
    const isValid = HSNValidator.validate(code)
    const detailedInfo = HSNValidator.getDetailedInfo(code)

    console.log(`\nHSN: ${code}`)
    console.log(`  Valid: ${isValid ? '✓' : '✗'}`)
    console.log(`  Description: ${detailedInfo.description}`)
    if (detailedInfo.gstRate !== undefined) {
      console.log(`  GST Rate: ${detailedInfo.gstRate}%`)
    }
    if (detailedInfo.unit) {
      console.log(`  Unit: ${detailedInfo.unit}`)
    }
  } catch (error: any) {
    console.log(`\nHSN: ${code}`)
    console.log(`  Valid: ✗`)
    console.log(`  Error: ${error.message}`)
  }
})
console.log()

// Example 11: HSN Registry Statistics
console.log('11. HSN Registry Statistics')
console.log('============================')

const stats = HSNRegistry.getCount()
console.log(`Total Chapters: ${stats.chapters}`)
console.log(`Total Registered HSN Codes: ${stats.codes}`)

// Count codes per GST rate
const rateDistribution: Record<number, number> = {}
HSNRegistry.getAllCodes().forEach(code => {
  if (code.gstRate !== undefined) {
    rateDistribution[code.gstRate] = (rateDistribution[code.gstRate] || 0) + 1
  }
})

console.log('\nGST Rate Distribution:')
Object.entries(rateDistribution)
  .sort(([a], [b]) => Number(a) - Number(b))
  .forEach(([rate, count]) => {
    console.log(`  ${rate}% GST: ${count} items`)
  })
console.log()

// Example 12: Search and Filter
console.log('12. Advanced Search and Filter')
console.log('================================')

// Find all electronics with 18% GST
const electronics = HSNRegistry.getAllCodes().filter(hsn =>
  (hsn.chapter === '84' || hsn.chapter === '85') && hsn.gstRate === 18
)

console.log(`Electronics (Chapter 84 & 85) with 18% GST:`)
console.log(`  Found: ${electronics.length} items`)
electronics.slice(0, 5).forEach(hsn => {
  console.log(`    - ${hsn.code}: ${hsn.description}`)
})
if (electronics.length > 5) {
  console.log(`    ... and ${electronics.length - 5} more`)
}
console.log()

// Find all items with cess
const itemsWithCess = HSNRegistry.getAllCodes().filter(hsn => hsn.cess && hsn.cess > 0)
console.log(`\nItems with Cess:`)
console.log(`  Found: ${itemsWithCess.length} items`)
itemsWithCess.forEach(hsn => {
  console.log(`    - ${hsn.code}: ${hsn.description} (${hsn.gstRate}% GST + ${hsn.cess}% cess)`)
})
console.log()

console.log('=== End of Example 6 ===')

console.log('\n💡 Tips:')
console.log('  - Use HSNRegistry.lookup() for quick HSN information')
console.log('  - Use HSNRegistry.searchByDescription() to find HSN codes')
console.log('  - The registry includes 99 chapters and 100+ common HSN codes')
console.log('  - GST rates are recommendations - verify with official sources')
console.log('  - You can extend the registry by adding more HSN codes')
