/**
 * @accounts/ewaybill - E-Way Bill API Integration Package
 *
 * Complete integration with the Government of India E-Way Bill System
 * for generating, managing, and tracking electronic waybills.
 *
 * @packageDocumentation
 */

// Export main client
export { EWayBillClient } from './client'

// Export authentication
export { EWayBillAuth } from './auth'

// Export utilities
export { EWayBillUtils } from './utils'

// Export validation
export { EWayBillValidator } from './validation'

// Export all types
export type {
  EWayBillConfig,
  AuthResponse,
  GenerateEWayBillRequest,
  GenerateEWayBillResponse,
  UpdateTransportDetailsRequest,
  UpdateTransportDetailsResponse,
  CancelEWayBillRequest,
  CancelEWayBillResponse,
  ExtendValidityRequest,
  ExtendValidityResponse,
  GetEWayBillDetailsRequest,
  EWayBillDetails,
  GetEWayBillsByDateRequest,
  EWayBillSummary,
  RejectEWayBillRequest,
  RejectEWayBillResponse,
  EWayBillErrorResponse,
  EWayBillAPIResponse,
  Address,
  EWayBillItem
} from './types'

// Export enums
export {
  SupplyType,
  SubSupplyType,
  DocumentType,
  TransactionType,
  VehicleType,
  TransportationMode,
  CancelReasonCode,
  ExtendValidityReasonCode,
  EWayBillStatus
} from './types'

// Export error classes
export {
  EWayBillError,
  AuthenticationError,
  ValidationError,
  APIError
} from './types'

/**
 * Create E-Way Bill client from configuration
 */
export function createEWayBillClient(config: Partial<import('./types').EWayBillConfig>): import('./client').EWayBillClient {
  // Get config from environment variables
  const fullConfig: import('./types').EWayBillConfig = {
    gstin: process.env.EWAYBILL_GSTIN || config.gstin || '',
    username: process.env.EWAYBILL_USERNAME || config.username || '',
    password: process.env.EWAYBILL_PASSWORD || config.password || '',
    appKey: process.env.EWAYBILL_APP_KEY || config.appKey || '',
    clientId: process.env.EWAYBILL_CLIENT_ID || config.clientId,
    clientSecret: process.env.EWAYBILL_CLIENT_SECRET || config.clientSecret,
    baseURL: process.env.EWAYBILL_BASE_URL || config.baseURL || 'https://api.ewaybillgst.gov.in',
    apiVersion: process.env.EWAYBILL_API_VERSION || config.apiVersion || 'v1.03',
    timeout: parseInt(process.env.EWAYBILL_TIMEOUT || '') || config.timeout || 30000,
    debug: process.env.EWAYBILL_DEBUG === 'true' || config.debug || false,
    cacheEnabled: process.env.EWAYBILL_CACHE_ENABLED !== 'false' && (config.cacheEnabled !== false),
    cacheTTL: parseInt(process.env.EWAYBILL_CACHE_TTL || '') || config.cacheTTL || 3600000,
    maxRetries: parseInt(process.env.EWAYBILL_MAX_RETRIES || '') || config.maxRetries || 3,
    retryDelay: parseInt(process.env.EWAYBILL_RETRY_DELAY || '') || config.retryDelay || 1000
  }

  // Validate required fields
  if (!fullConfig.gstin || !fullConfig.username || !fullConfig.password || !fullConfig.appKey) {
    throw new Error(
      'Missing required E-Way Bill configuration. Please provide: gstin, username, password, appKey'
    )
  }

  return new (require('./client').EWayBillClient)(fullConfig)
}

/**
 * Default export: EWayBillClient class
 */
export default import('./client').EWayBillClient
