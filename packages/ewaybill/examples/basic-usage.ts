/**
 * Basic E-Way Bill Usage Example
 */

import {
  createEWayBillClient,
  EWayBillClient,
  SupplyType,
  SubSupplyType,
  DocumentType,
  TransactionType,
  TransportationMode,
  VehicleType,
  CancelReasonCode
} from '../src'

// Example 1: Create client with environment variables
async function example1() {
  // Make sure you have set environment variables:
  // EWAYBILL_GSTIN, EWAYBILL_USERNAME, EWAYBILL_PASSWORD, EWAYBILL_APP_KEY

  const client = createEWayBillClient({})

  console.log('Client created successfully')
}

// Example 2: Create client with explicit configuration
async function example2() {
  const client = new EWayBillClient({
    gstin: '27AAPFU0939F1ZV',
    username: 'your_username',
    password: 'your_password',
    appKey: 'your_app_key',
    baseURL: 'https://api.ewaybillgst.gov.in',
    debug: true
  })

  console.log('Client created with explicit config')
}

// Example 3: Generate E-Way Bill
async function example3() {
  const client = createEWayBillClient({
    gstin: '27AAPFU0939F1ZV',
    username: 'your_username',
    password: 'your_password',
    appKey: 'your_app_key'
  })

  try {
    const result = await client.generate({
      supplyType: SupplyType.OUTWARD,
      subSupplyType: SubSupplyType.SUPPLY,
      docType: DocumentType.TAX_INVOICE,
      docNo: 'INV-001',
      docDate: '15/11/2024',

      // Supplier details
      fromGstin: '27AAPFU0939F1ZV',
      fromTrdName: 'ABC Corporation',
      fromAddr1: 'Plot 123, Industrial Area',
      fromAddr2: 'Phase 1',
      fromPlace: 'Mumbai',
      fromPincode: 400001,
      fromStateCode: 27,

      // Recipient details
      toGstin: '29BBBBB1234C1Z5',
      toTrdName: 'XYZ Limited',
      toAddr1: '456 MG Road',
      toAddr2: 'Bangalore',
      toPlace: 'Bangalore',
      toPincode: 560001,
      toStateCode: 29,

      // Transaction details
      transactionType: TransactionType.REGULAR,
      totalValue: 100000,
      cgstValue: 0,
      sgstValue: 0,
      igstValue: 18000,
      totInvValue: 118000,

      // Transport details
      transporterId: '27TRANS1234C1Z1',
      transMode: TransportationMode.ROAD,
      transDistance: 800,
      vehicleNo: 'MH01AB1234',
      vehicleType: VehicleType.REGULAR,

      // Items
      itemList: [
        {
          productName: 'Laptop',
          productDesc: 'Dell Laptop 15 inch',
          hsnCode: 84713000,
          quantity: 10,
          qtyUnit: 'NOS',
          igstRate: 18,
          taxableAmount: 100000
        }
      ]
    })

    console.log('E-Way Bill Generated:', result)
    console.log('E-Way Bill No:', result.ewayBillNo)
    console.log('Valid Upto:', result.validUpto)
  } catch (error) {
    console.error('Error generating E-Way Bill:', error)
  }
}

// Example 4: Update transport details
async function example4() {
  const client = createEWayBillClient({})

  try {
    const result = await client.updateTransportDetails({
      ewbNo: 123456789012,
      vehicleNo: 'MH02CD5678',
      fromPlace: 'Mumbai',
      fromState: 27,
      reasonCode: '1',
      reasonRem: 'Vehicle breakdown',
      transMode: TransportationMode.ROAD
    })

    console.log('Transport details updated:', result)
  } catch (error) {
    console.error('Error updating transport details:', error)
  }
}

// Example 5: Cancel E-Way Bill
async function example5() {
  const client = createEWayBillClient({})

  try {
    const result = await client.cancel({
      ewbNo: 123456789012,
      cancelRsnCode: CancelReasonCode.DATA_ENTRY_MISTAKE,
      cancelRmrk: 'Wrong recipient GSTIN entered'
    })

    console.log('E-Way Bill cancelled:', result)
  } catch (error) {
    console.error('Error cancelling E-Way Bill:', error)
  }
}

// Example 6: Extend validity
async function example6() {
  const client = createEWayBillClient({})

  try {
    const result = await client.extendValidity({
      ewbNo: 123456789012,
      vehicleNo: 'MH01AB1234',
      fromPlace: 'Pune',
      fromState: 27,
      remainingDistance: 200,
      extnRsnCode: 4, // Accident
      extnRemarks: 'Vehicle accident on highway',
      consignmentStatus: 'T',
      transitType: 'R'
    })

    console.log('Validity extended:', result)
    console.log('New validity:', result.validUpto)
  } catch (error) {
    console.error('Error extending validity:', error)
  }
}

// Example 7: Get E-Way Bill details
async function example7() {
  const client = createEWayBillClient({})

  try {
    const details = await client.getDetails(123456789012)

    console.log('E-Way Bill Details:', details)
    console.log('Status:', details.status)
    console.log('Valid Upto:', details.validUpto)
    console.log('Total Value:', details.totInvValue)
  } catch (error) {
    console.error('Error fetching E-Way Bill details:', error)
  }
}

// Example 8: Get E-Way Bills by date
async function example8() {
  const client = createEWayBillClient({})

  try {
    const bills = await client.getByDate('15/11/2024')

    console.log(`Found ${bills.length} E-Way Bills`)

    bills.forEach(bill => {
      console.log(`EWB: ${bill.ewayBillNo}, Status: ${bill.status}, Value: ${bill.totInvValue}`)
    })
  } catch (error) {
    console.error('Error fetching E-Way Bills:', error)
  }
}

// Example 9: Complete workflow - Generate, Update, and Get Details
async function example9() {
  const client = createEWayBillClient({})

  try {
    // Step 1: Generate E-Way Bill
    console.log('Step 1: Generating E-Way Bill...')
    const generated = await client.generate({
      supplyType: SupplyType.OUTWARD,
      subSupplyType: SubSupplyType.SUPPLY,
      docType: DocumentType.TAX_INVOICE,
      docNo: 'INV-002',
      docDate: '15/11/2024',

      fromGstin: '27AAPFU0939F1ZV',
      fromTrdName: 'ABC Corporation',
      fromAddr1: 'Plot 123',
      fromPlace: 'Mumbai',
      fromPincode: 400001,
      fromStateCode: 27,

      toGstin: '29BBBBB1234C1Z5',
      toTrdName: 'XYZ Limited',
      toAddr1: '456 MG Road',
      toPlace: 'Bangalore',
      toPincode: 560001,
      toStateCode: 29,

      transactionType: TransactionType.REGULAR,
      totalValue: 50000,
      igstValue: 9000,
      totInvValue: 59000,

      transMode: TransportationMode.ROAD,
      transDistance: 800,

      itemList: [
        {
          productName: 'Printer',
          hsnCode: 84433210,
          quantity: 5,
          qtyUnit: 'NOS',
          igstRate: 18,
          taxableAmount: 50000
        }
      ]
    })

    console.log('E-Way Bill generated:', generated.ewayBillNo)

    // Step 2: Update transport details
    console.log('Step 2: Updating transport details...')
    const updated = await client.updateTransportDetails({
      ewbNo: generated.ewayBillNo,
      vehicleNo: 'MH01AB1234',
      fromPlace: 'Mumbai',
      fromState: 27,
      transMode: TransportationMode.ROAD
    })

    console.log('Transport details updated')

    // Step 3: Get details
    console.log('Step 3: Fetching E-Way Bill details...')
    const details = await client.getDetails(generated.ewayBillNo)

    console.log('Complete E-Way Bill details:', {
      ewbNo: details.ewayBillNo,
      status: details.status,
      validUpto: details.validUpto,
      vehicleNo: details.vehicleNo,
      totalValue: details.totInvValue
    })
  } catch (error) {
    console.error('Error in workflow:', error)
  }
}

// Run examples
if (require.main === module) {
  console.log('E-Way Bill API Examples')
  console.log('========================\n')

  // Uncomment the example you want to run:

  // example1()
  // example2()
  // example3()
  // example4()
  // example5()
  // example6()
  // example7()
  // example8()
  // example9()
}
