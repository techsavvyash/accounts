/**
 * E-Way Bill Types and Interfaces
 * Based on GSTN E-Way Bill API v1.03 specification
 */

/**
 * E-Way Bill Configuration
 */
export interface EWayBillConfig {
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

/**
 * Authentication Response
 */
export interface AuthResponse {
  status: string
  authtoken: string
  sek: string // Session Encryption Key
  tokenExpiry?: number
}

/**
 * Supply Type
 */
export enum SupplyType {
  OUTWARD = 'O',    // Outward - taxable supply
  INWARD = 'I'      // Inward - tax on reverse charge basis
}

/**
 * Sub Supply Type
 */
export enum SubSupplyType {
  SUPPLY = '1',           // Supply
  IMPORT = '2',           // Import
  EXPORT = '3',           // Export
  JOB_WORK = '4',         // Job Work
  FOR_OWN_USE = '5',      // For Own Use
  JOB_WORK_RETURNS = '6', // Job Work Returns
  SALES_RETURN = '7',     // Sales Return
  OTHERS = '8',           // Others
  SKD_CKD = '9',          // SKD/CKD
  LINE_SALES = '10',      // Line Sales
  RECIPIENT_NOT_KNOWN = '11', // Recipient Not Known
  EXHIBITION_FAIRS = '12'     // Exhibition or Fairs
}

/**
 * Document Type
 */
export enum DocumentType {
  TAX_INVOICE = 'INV',
  BILL_OF_SUPPLY = 'BIL',
  BILL_OF_ENTRY = 'BOE',
  CHALLAN = 'CHL',
  CREDIT_NOTE = 'CNT',
  OTHERS = 'OTH'
}

/**
 * Transaction Type
 */
export enum TransactionType {
  REGULAR = '1',           // Regular
  BILL_TO_SHIP_TO = '2',  // Bill To - Ship To
  BILL_FROM_DISPATCH_FROM = '3', // Bill From - Dispatch From
  COMBINATION_2_3 = '4'    // Combination of 2 and 3
}

/**
 * Vehicle Type
 */
export enum VehicleType {
  REGULAR = 'R',     // Regular
  OVER_DIMENSIONAL_CARGO = 'O' // Over Dimensional Cargo
}

/**
 * Transportation Mode
 */
export enum TransportationMode {
  ROAD = '1',
  RAIL = '2',
  AIR = '3',
  SHIP = '4'
}

/**
 * Address Details
 */
export interface Address {
  addr1: string
  addr2?: string
  location: string
  pincode: number
  stateCode: number
}

/**
 * Item Details for E-Way Bill
 */
export interface EWayBillItem {
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

/**
 * E-Way Bill Generation Request (Part A)
 */
export interface GenerateEWayBillRequest {
  supplyType: SupplyType
  subSupplyType: SubSupplyType
  subSupplyDesc?: string
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

/**
 * E-Way Bill Generation Response
 */
export interface GenerateEWayBillResponse {
  ewayBillNo: number
  ewayBillDate: string
  validUpto: string
  alert?: string
}

/**
 * Update Transport Details Request (Part B)
 */
export interface UpdateTransportDetailsRequest {
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

/**
 * Update Transport Details Response
 */
export interface UpdateTransportDetailsResponse {
  ewayBillNo: number
  validUpto: string
  alert?: string
}

/**
 * Cancel E-Way Bill Request
 */
export interface CancelEWayBillRequest {
  ewbNo: number
  cancelRsnCode: number
  cancelRmrk: string
}

/**
 * Cancel E-Way Bill Response
 */
export interface CancelEWayBillResponse {
  ewayBillNo: number
  cancelDate: string
}

/**
 * Extend Validity Request
 */
export interface ExtendValidityRequest {
  ewbNo: number
  vehicleNo: string
  fromPlace: string
  fromState: number
  remainingDistance: number
  transDocNo?: string
  transDocDate?: string // DD/MM/YYYY
  transMode?: TransportationMode
  extnRsnCode: number
  extnRemarks: string
  consignmentStatus?: string
  transitType?: string
  addressLine1?: string
  addressLine2?: string
  addressLine3?: string
}

/**
 * Extend Validity Response
 */
export interface ExtendValidityResponse {
  ewayBillNo: number
  validUpto: string
  alert?: string
}

/**
 * Get E-Way Bill Details Request
 */
export interface GetEWayBillDetailsRequest {
  ewbNo: number
}

/**
 * E-Way Bill Full Details
 */
export interface EWayBillDetails {
  ewayBillNo: number
  ewayBillDate: string
  generatedBy: string
  validUpto: string

  // Document Details
  docNo: string
  docDate: string
  docType: DocumentType

  // Supplier Details
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number

  // Recipient Details
  toGstin?: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number

  // Value Details
  totalValue: number
  cgstValue?: number
  sgstValue?: number
  igstValue?: number
  cessValue?: number
  totInvValue: number

  // Transport Details
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transMode?: TransportationMode
  transDistance?: number
  transDocDate?: string
  vehicleNo?: string
  vehicleType?: VehicleType

  // Status
  status: string

  // Items
  itemList: EWayBillItem[]
}

/**
 * Get E-Way Bills by Date Request
 */
export interface GetEWayBillsByDateRequest {
  date: string // DD/MM/YYYY
}

/**
 * E-Way Bill Summary
 */
export interface EWayBillSummary {
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

/**
 * Reject E-Way Bill Request
 */
export interface RejectEWayBillRequest {
  ewbNo: number
}

/**
 * Reject E-Way Bill Response
 */
export interface RejectEWayBillResponse {
  ewayBillNo: number
  rejectDate: string
}

/**
 * E-Way Bill Error Response
 */
export interface EWayBillErrorResponse {
  status: string
  errorCodes?: string[]
  error?: {
    message: string
    error_cd?: string
  }
}

/**
 * API Response Wrapper
 */
export interface EWayBillAPIResponse<T = any> {
  status: string
  data?: T
  errorCodes?: string[]
  error?: {
    message: string
    error_cd?: string
  }
}

/**
 * Cancel Reason Codes
 */
export enum CancelReasonCode {
  DUPLICATE = 1,
  DATA_ENTRY_MISTAKE = 2,
  ORDER_CANCELLED = 3,
  OTHERS = 4
}

/**
 * Extend Validity Reason Codes
 */
export enum ExtendValidityReasonCode {
  NATURAL_CALAMITY = 1,
  LAW_AND_ORDER = 2,
  TRANSHIPMENT = 3,
  ACCIDENT = 4,
  OTHERS = 5
}

/**
 * E-Way Bill Status
 */
export enum EWayBillStatus {
  ACTIVE = 'ACT',
  CANCELLED = 'CNL',
  EXPIRED = 'EXP',
  REJECTED = 'REJ'
}

/**
 * Custom Error Classes
 */
export class EWayBillError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'EWayBillError'
  }
}

export class AuthenticationError extends EWayBillError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends EWayBillError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class APIError extends EWayBillError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details)
    this.name = 'APIError'
  }
}
