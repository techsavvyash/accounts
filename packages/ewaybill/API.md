# E-Way Bill Package API Reference

Complete API reference for the `@accounts/ewaybill` package.

## Table of Contents

- [Client Operations](#client-operations)
- [Utilities](#utilities)
- [Validation](#validation)
- [Types](#types)
- [Enums](#enums)
- [Error Classes](#error-classes)

---

## Client Operations

### EWayBillClient

Main client class for interacting with the E-Way Bill API.

#### Constructor

```typescript
new EWayBillClient(config: EWayBillConfig)
```

**Parameters:**

```typescript
interface EWayBillConfig {
  gstin: string              // Your GSTIN (required)
  username: string           // E-Way Bill username (required)
  password: string           // E-Way Bill password (required)
  appKey: string            // Application key (required)
  clientId?: string         // Optional client ID
  clientSecret?: string     // Optional client secret
  baseURL?: string          // API base URL (default: production)
  apiVersion?: string       // API version (default: v1.03)
  timeout?: number          // Request timeout in ms (default: 30000)
  debug?: boolean           // Enable debug logging (default: false)
  cacheEnabled?: boolean    // Enable caching (default: true)
  cacheTTL?: number         // Cache TTL in ms (default: 3600000)
  maxRetries?: number       // Max retry attempts (default: 3)
  retryDelay?: number       // Retry delay in ms (default: 1000)
}
```

#### Methods

##### generate()

Generate a new E-Way Bill.

```typescript
async generate(request: GenerateEWayBillRequest): Promise<GenerateEWayBillResponse>
```

**Request:**

```typescript
interface GenerateEWayBillRequest {
  // Document Details
  supplyType: SupplyType
  subSupplyType: SubSupplyType
  docType: DocumentType
  docNo: string
  docDate: string // DD/MM/YYYY

  // Supplier/Consignor Details
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  actFromStateCode?: number

  // Recipient/Consignee Details
  toGstin?: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number
  actToStateCode?: number

  // Transaction Details
  transactionType: TransactionType
  otherValue?: number
  totalValue: number
  cgstValue?: number
  sgstValue?: number
  igstValue?: number
  cessValue?: number
  cessNonAdvolValue?: number
  totInvValue: number

  // Transport Details (Part B)
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transMode?: TransportationMode
  transDistance?: number
  transDocDate?: string // DD/MM/YYYY
  vehicleNo?: string
  vehicleType?: VehicleType

  // Item Details
  itemList: EWayBillItem[]
}

interface EWayBillItem {
  productName: string
  productDesc?: string
  hsnCode: number
  quantity: number
  qtyUnit: string
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
  cessRate?: number
  cessNonAdvol?: number
  taxableAmount: number
}
```

**Response:**

```typescript
interface GenerateEWayBillResponse {
  ewayBillNo: number
  ewayBillDate: string
  validUpto: string
  alert?: string
}
```

**Example:**

```typescript
const result = await client.generate({
  supplyType: SupplyType.OUTWARD,
  subSupplyType: SubSupplyType.SUPPLY,
  docType: DocumentType.TAX_INVOICE,
  docNo: 'INV-001',
  docDate: '15/11/2024',
  fromGstin: '27AAPFU0939F1ZV',
  fromTrdName: 'ABC Corp',
  fromAddr1: 'Plot 123',
  fromPlace: 'Mumbai',
  fromPincode: 400001,
  fromStateCode: 27,
  toGstin: '29BBBBB1234C1Z5',
  toTrdName: 'XYZ Ltd',
  toAddr1: '456 MG Road',
  toPlace: 'Bangalore',
  toPincode: 560001,
  toStateCode: 29,
  transactionType: TransactionType.REGULAR,
  totalValue: 100000,
  igstValue: 18000,
  totInvValue: 118000,
  transMode: TransportationMode.ROAD,
  transDistance: 800,
  vehicleNo: 'MH01AB1234',
  itemList: [{
    productName: 'Laptop',
    hsnCode: 84713000,
    quantity: 10,
    qtyUnit: 'NOS',
    igstRate: 18,
    taxableAmount: 100000
  }]
})
```

---

##### updateTransportDetails()

Update transport details (Part B) of an existing E-Way Bill.

```typescript
async updateTransportDetails(request: UpdateTransportDetailsRequest): Promise<UpdateTransportDetailsResponse>
```

**Request:**

```typescript
interface UpdateTransportDetailsRequest {
  ewbNo: number
  vehicleNo?: string
  fromPlace?: string
  fromState?: number
  reasonCode?: string
  reasonRem?: string
  transDocNo?: string
  transDocDate?: string // DD/MM/YYYY
  transMode?: TransportationMode
  vehicleType?: VehicleType
}
```

**Response:**

```typescript
interface UpdateTransportDetailsResponse {
  ewayBillNo: number
  validUpto: string
  alert?: string
}
```

**Example:**

```typescript
const result = await client.updateTransportDetails({
  ewbNo: 123456789012,
  vehicleNo: 'MH02CD5678',
  fromPlace: 'Mumbai',
  fromState: 27,
  reasonCode: '1',
  reasonRem: 'Vehicle change',
  transMode: TransportationMode.ROAD
})
```

---

##### cancel()

Cancel an E-Way Bill within 24 hours of generation.

```typescript
async cancel(request: CancelEWayBillRequest): Promise<CancelEWayBillResponse>
```

**Request:**

```typescript
interface CancelEWayBillRequest {
  ewbNo: number
  cancelRsnCode: number // 1-4
  cancelRmrk: string
}
```

**Response:**

```typescript
interface CancelEWayBillResponse {
  ewayBillNo: number
  cancelDate: string
}
```

**Example:**

```typescript
const result = await client.cancel({
  ewbNo: 123456789012,
  cancelRsnCode: 2, // Data entry mistake
  cancelRmrk: 'Wrong recipient GSTIN'
})
```

---

##### extendValidity()

Extend the validity of an E-Way Bill.

```typescript
async extendValidity(request: ExtendValidityRequest): Promise<ExtendValidityResponse>
```

**Request:**

```typescript
interface ExtendValidityRequest {
  ewbNo: number
  vehicleNo: string
  fromPlace: string
  fromState: number
  remainingDistance: number
  transDocNo?: string
  transDocDate?: string // DD/MM/YYYY
  transMode?: TransportationMode
  extnRsnCode: number // 1-5
  extnRemarks: string
  consignmentStatus?: string
  transitType?: string
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
}
```

**Response:**

```typescript
interface ExtendValidityResponse {
  ewayBillNo: number
  validUpto: string
  alert?: string
}
```

**Example:**

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

---

##### getDetails()

Get complete details of an E-Way Bill.

```typescript
async getDetails(ewbNo: number): Promise<EWayBillDetails>
```

**Parameters:**
- `ewbNo` - 12-digit E-Way Bill number

**Response:**

```typescript
interface EWayBillDetails {
  ewayBillNo: number
  ewayBillDate: string
  generatedBy: string
  validUpto: string
  docNo: string
  docDate: string
  docType: DocumentType
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  toGstin?: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number
  totalValue: number
  cgstValue?: number
  sgstValue?: number
  igstValue?: number
  cessValue?: number
  totInvValue: number
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transMode?: TransportationMode
  transDistance?: number
  transDocDate?: string
  vehicleNo?: string
  vehicleType?: VehicleType
  status: string
  itemList: EWayBillItem[]
}
```

**Example:**

```typescript
const details = await client.getDetails(123456789012)
console.log('Status:', details.status)
console.log('Valid Until:', details.validUpto)
```

---

##### getByDate()

Get all E-Way Bills generated on a specific date.

```typescript
async getByDate(date: string): Promise<EWayBillSummary[]>
```

**Parameters:**
- `date` - Date in DD/MM/YYYY format

**Response:**

```typescript
interface EWayBillSummary {
  ewayBillNo: number
  ewayBillDate: string
  generatedBy: string
  validUpto: string
  docNo: string
  docDate: string
  fromGstin: string
  fromTrdName: string
  toGstin?: string
  toTrdName: string
  status: string
  totInvValue: number
}
```

**Example:**

```typescript
const bills = await client.getByDate('15/11/2024')
bills.forEach(bill => {
  console.log(`${bill.ewayBillNo}: ${bill.status}`)
})
```

---

##### reject()

Reject an E-Way Bill generated by others on your GSTIN.

```typescript
async reject(request: RejectEWayBillRequest): Promise<RejectEWayBillResponse>
```

**Request:**

```typescript
interface RejectEWayBillRequest {
  ewbNo: number
}
```

**Response:**

```typescript
interface RejectEWayBillResponse {
  ewayBillNo: number
  rejectDate: string
}
```

**Example:**

```typescript
const result = await client.reject({ ewbNo: 123456789012 })
```

---

##### getRejectedByOthers()

Get E-Way Bills that were rejected by others.

```typescript
async getRejectedByOthers(date: string): Promise<EWayBillSummary[]>
```

**Example:**

```typescript
const rejected = await client.getRejectedByOthers('15/11/2024')
```

---

##### Utility Methods

```typescript
// Check authentication status
client.isAuthenticated(): boolean

// Manually authenticate
await client.authenticate(): Promise<void>

// Clear authentication
client.clearAuth(): void

// Clear all caches
client.clearAllCaches(): void
```

---

## Utilities

### EWayBillUtils

Collection of utility functions for E-Way Bill operations.

#### Validation Methods

```typescript
// Validate GSTIN format
EWayBillUtils.validateGSTIN(gstin: string): boolean

// Validate pincode
EWayBillUtils.validatePincode(pincode: number): boolean

// Validate HSN code
EWayBillUtils.validateHSN(hsnCode: number): boolean

// Validate state code (1-38)
EWayBillUtils.validateStateCode(stateCode: number): boolean

// Validate vehicle number
EWayBillUtils.validateVehicleNumber(vehicleNo: string): boolean

// Validate document number
EWayBillUtils.validateDocumentNumber(docNo: string): boolean

// Validate quantity unit
EWayBillUtils.isValidQuantityUnit(unit: string): boolean
```

#### Date Methods

```typescript
// Format date to DD/MM/YYYY
EWayBillUtils.formatDate(date: Date | string): string

// Parse DD/MM/YYYY to Date
EWayBillUtils.parseDate(dateStr: string): Date
```

#### Calculation Methods

```typescript
// Calculate E-Way Bill validity in days
EWayBillUtils.calculateValidity(distance: number, isODC: boolean = false): number

// Calculate validity end date
EWayBillUtils.calculateValidityDate(
  startDate: Date | string,
  distance: number,
  isODC: boolean = false
): Date

// Check if validity is expired
EWayBillUtils.isValidityExpired(validUpto: Date | string): boolean

// Check if can extend validity (within 8-hour window)
EWayBillUtils.canExtendValidity(validUpto: Date | string): boolean

// Check if can cancel (within 24 hours)
EWayBillUtils.canCancel(ewayBillDate: Date | string): boolean

// Calculate total invoice value
EWayBillUtils.calculateTotalInvoiceValue(
  taxableAmount: number,
  cgst?: number,
  sgst?: number,
  igst?: number,
  cess?: number,
  otherValue?: number
): number

// Round to 2 decimal places
EWayBillUtils.round(value: number): number
```

#### Formatting Methods

```typescript
// Format vehicle number (uppercase, no spaces)
EWayBillUtils.formatVehicleNumber(vehicleNo: string): string

// Get state name from code
EWayBillUtils.getStateName(stateCode: number): string

// Sanitize string for API
EWayBillUtils.sanitizeString(str: string): string

// Generate unique request ID
EWayBillUtils.generateRequestId(): string
```

#### Business Logic Methods

```typescript
// Check if E-Way Bill is required
EWayBillUtils.isEWayBillRequired(invoiceValue: number, distance?: number): boolean
```

---

## Validation

### EWayBillValidator

Comprehensive validation for all E-Way Bill operations.

```typescript
// Validate generate request
EWayBillValidator.validateGenerateRequest(request: GenerateEWayBillRequest): void

// Validate update request
EWayBillValidator.validateUpdateRequest(request: UpdateTransportDetailsRequest): void

// Validate cancel request
EWayBillValidator.validateCancelRequest(request: CancelEWayBillRequest): void

// Validate extend request
EWayBillValidator.validateExtendRequest(request: ExtendValidityRequest): void

// Validate E-Way Bill number
EWayBillValidator.validateEWayBillNumber(ewbNo: number): void
```

All validation methods throw `ValidationError` with details on failure.

---

## Types

### Configuration

```typescript
interface EWayBillConfig {
  gstin: string
  username: string
  password: string
  appKey: string
  clientId?: string
  clientSecret?: string
  baseURL?: string
  apiVersion?: string
  timeout?: number
  debug?: boolean
  cacheEnabled?: boolean
  cacheTTL?: number
  maxRetries?: number
  retryDelay?: number
}
```

### Address

```typescript
interface Address {
  addr1: string
  addr2?: string
  location: string
  pincode: number
  stateCode: number
}
```

---

## Enums

### SupplyType

```typescript
enum SupplyType {
  OUTWARD = 'O',    // Outward - taxable supply
  INWARD = 'I'      // Inward - tax on reverse charge basis
}
```

### SubSupplyType

```typescript
enum SubSupplyType {
  SUPPLY = '1',
  IMPORT = '2',
  EXPORT = '3',
  JOB_WORK = '4',
  FOR_OWN_USE = '5',
  JOB_WORK_RETURNS = '6',
  SALES_RETURN = '7',
  OTHERS = '8',
  SKD_CKD = '9',
  LINE_SALES = '10',
  RECIPIENT_NOT_KNOWN = '11',
  EXHIBITION_FAIRS = '12'
}
```

### DocumentType

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

### TransactionType

```typescript
enum TransactionType {
  REGULAR = '1',
  BILL_TO_SHIP_TO = '2',
  BILL_FROM_DISPATCH_FROM = '3',
  COMBINATION_2_3 = '4'
}
```

### VehicleType

```typescript
enum VehicleType {
  REGULAR = 'R',
  OVER_DIMENSIONAL_CARGO = 'O'
}
```

### TransportationMode

```typescript
enum TransportationMode {
  ROAD = '1',
  RAIL = '2',
  AIR = '3',
  SHIP = '4'
}
```

### CancelReasonCode

```typescript
enum CancelReasonCode {
  DUPLICATE = 1,
  DATA_ENTRY_MISTAKE = 2,
  ORDER_CANCELLED = 3,
  OTHERS = 4
}
```

### ExtendValidityReasonCode

```typescript
enum ExtendValidityReasonCode {
  NATURAL_CALAMITY = 1,
  LAW_AND_ORDER = 2,
  TRANSHIPMENT = 3,
  ACCIDENT = 4,
  OTHERS = 5
}
```

### EWayBillStatus

```typescript
enum EWayBillStatus {
  ACTIVE = 'ACT',
  CANCELLED = 'CNL',
  EXPIRED = 'EXP',
  REJECTED = 'REJ'
}
```

---

## Error Classes

### EWayBillError

Base error class for all E-Way Bill errors.

```typescript
class EWayBillError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  )
}
```

### AuthenticationError

Thrown when authentication fails.

```typescript
class AuthenticationError extends EWayBillError {
  constructor(message: string, details?: any)
}
```

### ValidationError

Thrown when validation fails.

```typescript
class ValidationError extends EWayBillError {
  constructor(message: string, details?: any)
}
```

### APIError

Thrown when API requests fail.

```typescript
class APIError extends EWayBillError {
  constructor(message: string, code?: string, details?: any)
}
```

**Usage:**

```typescript
try {
  await client.generate(request)
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle auth error
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details)
  } else if (error instanceof APIError) {
    console.error('API error:', error.code, error.message)
  }
}
```

---

## Helper Functions

### createEWayBillClient()

Create an E-Way Bill client with automatic environment variable loading.

```typescript
function createEWayBillClient(config?: Partial<EWayBillConfig>): EWayBillClient
```

**Example:**

```typescript
// Uses environment variables
const client = createEWayBillClient({})

// Override specific values
const client = createEWayBillClient({
  debug: true,
  timeout: 60000
})
```

---

## Official References

- **API Documentation**: https://docs.ewaybillgst.gov.in/apidocs/
- **E-Way Bill Portal**: https://ewaybillgst.gov.in
- **GST Portal**: https://www.gst.gov.in/

---

For more examples, see [README.md](./README.md) and [examples](./examples) directory.
