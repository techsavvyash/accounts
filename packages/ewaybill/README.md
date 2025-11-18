# @accounts/ewaybill

> Complete E-Way Bill API integration for India - Generate, manage, and track electronic waybills with the Government of India E-Way Bill System.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## Features

- ✅ **Complete API Coverage** - Generate, update, cancel, extend, and query E-Way Bills
- 🔐 **Secure Authentication** - Automatic token management and renewal
- ✨ **TypeScript First** - Full type safety with comprehensive type definitions
- 🚀 **Production Ready** - Built-in retry logic, caching, and error handling
- 📝 **Extensive Validation** - Comprehensive input validation following GST rules
- 🎯 **Simple API** - Clean, intuitive interface for all operations
- 🧪 **Well Tested** - Comprehensive test coverage
- 📚 **Excellent Documentation** - Detailed API reference and examples

## Installation

```bash
bun add @accounts/ewaybill
# or
npm install @accounts/ewaybill
# or
yarn add @accounts/ewaybill
```

## Quick Start

### 1. Setup Configuration

Create a `.env` file with your E-Way Bill API credentials:

```env
EWAYBILL_GSTIN=27AAPFU0939F1ZV
EWAYBILL_USERNAME=your_username
EWAYBILL_PASSWORD=your_password
EWAYBILL_APP_KEY=your_app_key
EWAYBILL_BASE_URL=https://api.ewaybillgst.gov.in
```

Get your credentials from: https://ewaybillgst.gov.in

### 2. Generate an E-Way Bill

```typescript
import { createEWayBillClient, SupplyType, SubSupplyType, DocumentType, TransactionType, TransportationMode } from '@accounts/ewaybill'

const client = createEWayBillClient({})

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
  fromPlace: 'Mumbai',
  fromPincode: 400001,
  fromStateCode: 27,

  // Recipient details
  toGstin: '29BBBBB1234C1Z5',
  toTrdName: 'XYZ Limited',
  toAddr1: '456 MG Road',
  toPlace: 'Bangalore',
  toPincode: 560001,
  toStateCode: 29,

  // Transaction details
  transactionType: TransactionType.REGULAR,
  totalValue: 100000,
  igstValue: 18000,
  totInvValue: 118000,

  // Transport details
  transMode: TransportationMode.ROAD,
  transDistance: 800,
  vehicleNo: 'MH01AB1234',

  // Items
  itemList: [
    {
      productName: 'Laptop',
      hsnCode: 84713000,
      quantity: 10,
      qtyUnit: 'NOS',
      igstRate: 18,
      taxableAmount: 100000
    }
  ]
})

console.log('E-Way Bill No:', result.ewayBillNo)
console.log('Valid Upto:', result.validUpto)
```

## Core Operations

### Generate E-Way Bill

```typescript
const result = await client.generate({
  // Request details
})
// Returns: { ewayBillNo, ewayBillDate, validUpto }
```

### Update Transport Details

```typescript
const result = await client.updateTransportDetails({
  ewbNo: 123456789012,
  vehicleNo: 'MH02CD5678',
  fromPlace: 'Mumbai',
  fromState: 27,
  transMode: TransportationMode.ROAD
})
```

### Cancel E-Way Bill

```typescript
import { CancelReasonCode } from '@accounts/ewaybill'

const result = await client.cancel({
  ewbNo: 123456789012,
  cancelRsnCode: CancelReasonCode.DATA_ENTRY_MISTAKE,
  cancelRmrk: 'Wrong recipient GSTIN'
})
```

### Extend Validity

```typescript
const result = await client.extendValidity({
  ewbNo: 123456789012,
  vehicleNo: 'MH01AB1234',
  fromPlace: 'Pune',
  fromState: 27,
  remainingDistance: 200,
  extnRsnCode: 4, // Accident
  extnRemarks: 'Vehicle breakdown'
})
```

### Get E-Way Bill Details

```typescript
const details = await client.getDetails(123456789012)

console.log('Status:', details.status)
console.log('Valid Upto:', details.validUpto)
console.log('Items:', details.itemList)
```

### Get E-Way Bills by Date

```typescript
const bills = await client.getByDate('15/11/2024')

bills.forEach(bill => {
  console.log(`${bill.ewayBillNo}: ${bill.status} - ₹${bill.totInvValue}`)
})
```

### Reject E-Way Bill

```typescript
const result = await client.reject({
  ewbNo: 123456789012
})
```

## Configuration Options

```typescript
import { EWayBillClient } from '@accounts/ewaybill'

const client = new EWayBillClient({
  // Required
  gstin: '27AAPFU0939F1ZV',
  username: 'your_username',
  password: 'your_password',
  appKey: 'your_app_key',

  // Optional
  clientId: 'optional_client_id',
  clientSecret: 'optional_client_secret',
  baseURL: 'https://api.ewaybillgst.gov.in', // Production
  // baseURL: 'https://sandbox.ewaybillgst.gov.in', // Sandbox
  apiVersion: 'v1.03',
  timeout: 30000, // 30 seconds
  debug: false,
  cacheEnabled: true,
  cacheTTL: 3600000, // 1 hour
  maxRetries: 3,
  retryDelay: 1000
})
```

## Validation

The package includes comprehensive validation for all inputs:

```typescript
import { EWayBillValidator, EWayBillUtils } from '@accounts/ewaybill'

// Validate GSTIN
const isValid = EWayBillUtils.validateGSTIN('27AAPFU0939F1ZV') // true

// Validate vehicle number
const isValidVehicle = EWayBillUtils.validateVehicleNumber('MH01AB1234') // true

// Calculate validity
const days = EWayBillUtils.calculateValidity(800, false) // 4 days for 800 km

// Format date
const formatted = EWayBillUtils.formatDate(new Date()) // DD/MM/YYYY
```

## Error Handling

```typescript
import {
  EWayBillError,
  AuthenticationError,
  ValidationError,
  APIError
} from '@accounts/ewaybill'

try {
  const result = await client.generate(request)
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message)
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message, error.details)
  } else if (error instanceof APIError) {
    console.error('API error:', error.message, error.code)
  } else if (error instanceof EWayBillError) {
    console.error('E-Way Bill error:', error.message)
  }
}
```

## Types and Enums

### Supply Types

```typescript
enum SupplyType {
  OUTWARD = 'O',    // Outward - taxable supply
  INWARD = 'I'      // Inward - tax on reverse charge basis
}
```

### Document Types

```typescript
enum DocumentType {
  TAX_INVOICE = 'INV',
  BILL_OF_SUPPLY = 'BIL',
  BILL_OF_ENTRY = 'BOE',
  CHALLAN = 'CHL',
  CREDIT_NOTE = 'CNT',
  OTHERS = 'OTH'
}
```

### Transportation Modes

```typescript
enum TransportationMode {
  ROAD = '1',
  RAIL = '2',
  AIR = '3',
  SHIP = '4'
}
```

### Cancel Reason Codes

```typescript
enum CancelReasonCode {
  DUPLICATE = 1,
  DATA_ENTRY_MISTAKE = 2,
  ORDER_CANCELLED = 3,
  OTHERS = 4
}
```

See [API.md](./API.md) for complete type definitions.

## Important Notes

### E-Way Bill Rules (2025)

1. **Generation Limit**: E-Way Bills can only be generated within **180 days** of document date (effective Jan 1, 2025)
2. **Cancellation Window**: E-Way Bills can be cancelled only within **24 hours** of generation
3. **Validity Calculation**:
   - Normal cargo: 1 day per 200 km
   - Over Dimensional Cargo (ODC): 1 day per 20 km
4. **Extension Window**: Can extend validity **8 hours before or after** expiry
5. **Maximum Validity**: Cannot extend beyond **360 days** from generation

### Best Practices

1. **Cache E-Way Bill Details**: Use the built-in caching to avoid repeated API calls
2. **Validate Before Submission**: Use the validation utilities before making API calls
3. **Handle Errors Gracefully**: Always wrap API calls in try-catch blocks
4. **Monitor Validity**: Check validity dates before transport starts
5. **Update Transport Details**: Update Part B when vehicle changes

## Testing

The package uses Bun for testing:

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/utils.test.ts

# Run with coverage
bun test --coverage
```

## Environment Variables

Create a `.env` file:

```env
# Required
EWAYBILL_GSTIN=27AAPFU0939F1ZV
EWAYBILL_USERNAME=your_username
EWAYBILL_PASSWORD=your_password
EWAYBILL_APP_KEY=your_app_key

# Optional
EWAYBILL_CLIENT_ID=
EWAYBILL_CLIENT_SECRET=
EWAYBILL_BASE_URL=https://api.ewaybillgst.gov.in
EWAYBILL_API_VERSION=v1.03
EWAYBILL_TIMEOUT=30000
EWAYBILL_DEBUG=false
EWAYBILL_CACHE_ENABLED=true
EWAYBILL_CACHE_TTL=3600000
EWAYBILL_MAX_RETRIES=3
EWAYBILL_RETRY_DELAY=1000
```

## Examples

See the [examples](./examples) directory for more examples:

- [basic-usage.ts](./examples/basic-usage.ts) - Complete examples of all operations

## API Reference

See [API.md](./API.md) for detailed API documentation.

## Official Resources

- **E-Way Bill Portal**: https://ewaybillgst.gov.in
- **API Documentation**: https://docs.ewaybillgst.gov.in/apidocs/
- **GST Portal**: https://www.gst.gov.in/
- **Developer Portal**: https://developer.gst.gov.in/apiportal/

## Requirements

- Bun >= 1.0 or Node.js >= 18
- TypeScript >= 5.0 (for development)
- Valid E-Way Bill API credentials
- Active GSTIN registration

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass
2. Code follows existing style
3. TypeScript types are properly defined
4. Documentation is updated

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the [API documentation](./API.md)
2. Review [examples](./examples)
3. Open an issue on GitHub

## Changelog

### v1.0.0 (2024-11-18)

- ✨ Initial release
- ✅ Complete E-Way Bill API integration
- ✅ Generate, update, cancel, extend operations
- ✅ Query and retrieval operations
- ✅ Comprehensive validation
- ✅ Full TypeScript support
- ✅ Extensive test coverage
- ✅ Complete documentation

---

**Made with ❤️ for Indian businesses**
