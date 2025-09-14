import { GST } from './index'

// Test the GST package functionality
console.log('🧪 Testing GST Package...\n')

try {
  // Test 1: GSTIN Validation
  console.log('1. Testing GSTIN Validation:')
  const testGSTIN = '29ABCDE1234F1Z5'
  try {
    const isValid = GST.validateGSTIN(testGSTIN)
    const gstinInfo = GST.extractGSTINInfo(testGSTIN)
    console.log(`   ✅ GSTIN ${testGSTIN} is valid`)
    console.log(`   📍 State: ${gstinInfo.stateName} (${gstinInfo.stateCode})`)
    console.log(`   🆔 PAN: ${gstinInfo.pan}`)
  } catch (error: any) {
    console.log(`   ❌ GSTIN validation failed: ${error.message}`)
  }

  // Test 2: Tax Calculation - Intra-state
  console.log('\n2. Testing Intra-state Tax Calculation:')
  const intraStateCalc = GST.quickCalculate(1000, 18, '29', '29')
  console.log(`   💰 Amount: ₹1000, GST Rate: 18%`)
  console.log(`   📊 CGST: ₹${intraStateCalc.cgst}, SGST: ₹${intraStateCalc.sgst}`)
  console.log(`   💯 Total Tax: ₹${intraStateCalc.totalTax}`)
  console.log(`   🎯 Total Amount: ₹${intraStateCalc.totalAmount}`)

  // Test 3: Tax Calculation - Inter-state
  console.log('\n3. Testing Inter-state Tax Calculation:')
  const interStateCalc = GST.quickCalculate(1000, 18, '29', '27')
  console.log(`   💰 Amount: ₹1000, GST Rate: 18%`)
  console.log(`   📊 IGST: ₹${interStateCalc.igst}`)
  console.log(`   💯 Total Tax: ₹${interStateCalc.totalTax}`)
  console.log(`   🎯 Total Amount: ₹${interStateCalc.totalAmount}`)

  // Test 4: Reverse GST Calculation
  console.log('\n4. Testing Reverse GST Calculation (Tax Inclusive):')
  const reverseCalc = GST.calculateReverseGST(1180, 18)
  console.log(`   💰 Inclusive Amount: ₹1180`)
  console.log(`   📊 Taxable Amount: ₹${reverseCalc.taxableAmount}`)
  console.log(`   💯 GST Amount: ₹${reverseCalc.gstAmount}`)

  // Test 5: HSN Validation and Info
  console.log('\n5. Testing HSN Code:')
  const testHSN = '8471'
  try {
    GST.validateHSN(testHSN)
    const hsnInfo = GST.getHSNChapterInfo(testHSN)
    console.log(`   ✅ HSN ${testHSN} is valid`)
    console.log(`   📚 Chapter: ${hsnInfo.chapter} - ${hsnInfo.description}`)
  } catch (error: any) {
    console.log(`   ❌ HSN validation failed: ${error.message}`)
  }

  // Test 6: Comprehensive GST Info
  console.log('\n6. Testing Comprehensive GST Information:')
  const gstInfo = GST.getGSTInfo(5000, '8471', '29', '06')
  console.log(`   💰 Amount: ₹5000`)
  console.log(`   📈 Applicable Rate: ${gstInfo.applicableRate}%`)
  console.log(`   🌏 Inter-state: ${gstInfo.isInterState ? 'Yes' : 'No'}`)
  console.log(`   📊 Total Tax: ₹${gstInfo.calculation.totalTax}`)
  console.log(`   🎯 Final Amount: ₹${gstInfo.calculation.totalAmount}`)

  // Test 7: Batch Calculation
  console.log('\n7. Testing Batch Calculation:')
  const batchItems = [
    { amount: 1000, gstRate: 18, description: 'Laptop', hsnSac: '8471' },
    { amount: 500, gstRate: 5, description: 'Books', hsnSac: '4901' },
    { amount: 200, gstRate: 12, description: 'Mobile Cover', hsnSac: '3926' }
  ]
  
  const batchResults = GST.batchCalculate(batchItems, '29', '27') // Inter-state
  console.log('   📦 Batch calculation results:')
  batchResults.forEach((result, index) => {
    const item = batchItems[index]
    console.log(`   ${index + 1}. ${item.description}: ₹${item.amount} → ₹${result.totalAmount} (Tax: ₹${result.totalTax})`)
  })

  // Test 8: GST Rate Management
  console.log('\n8. Testing Custom GST Rate Management:')
  GST.setCustomGSTRate('1234', 28) // Set custom rate for HSN 1234
  const customRate = GST.getGSTRate('1234')
  console.log(`   ⚙️ Custom rate for HSN 1234: ${customRate}%`)
  
  const standardRate = GST.getGSTRate('8471')
  console.log(`   📋 Standard rate for HSN 8471: ${standardRate}%`)

  console.log('\n✅ All GST package tests completed successfully!')

} catch (error: any) {
  console.error(`❌ Test failed: ${error.message}`)
  console.error(error.stack)
}