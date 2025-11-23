/**
 * E-way Bill HSN API Provider
 *
 * Integrates with the official Government of India E-way Bill GST API
 * Docs: https://docs.ewaybillgst.gov.in/apidocs/
 *
 * Note: Requires GST registration and API credentials from the E-way Bill portal
 */

import { HSNAPIProvider, HSNLookupResult, HSNProviderConfig } from '../hsn-api-provider'

export interface EWayBillConfig extends HSNProviderConfig {
  baseURL: string
  username: string
  password: string
  appKey: string
  gstin: string
  clientId?: string
  clientSecret?: string
}

interface EWayBillAuthResponse {
  status: string
  authtoken: string
  sek: string // Session encryption key
}

interface EWayBillHSNResponse {
  status: string
  data?: string // Encrypted data containing HSN details
  errorCodes?: string[]
}

/**
 * E-way Bill HSN API Provider
 */
export class EWayBillProvider extends HSNAPIProvider {
  private authToken: string | null = null
  private sek: string | null = null
  private tokenExpiry: number = 0

  constructor(config: EWayBillConfig) {
    super(config)
  }

  getName(): string {
    return 'ewaybill'
  }

  /**
   * Authenticate and get auth token
   */
  private async authenticate(): Promise<boolean> {
    const config = this.config as EWayBillConfig

    try {
      const response = await fetch(`${config.baseURL}/v1.03/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.clientId && { 'client-id': config.clientId }),
          ...(config.clientSecret && { 'client-secret': config.clientSecret })
        },
        body: JSON.stringify({
          action: 'ACCESSTOKEN',
          username: config.username,
          password: config.password,
          app_key: config.appKey
        })
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`)
      }

      const data: EWayBillAuthResponse = await response.json()

      if (data.status === '1' && data.authtoken) {
        this.authToken = data.authtoken
        this.sek = data.sek
        // Token expires after 360 minutes (6 hours)
        this.tokenExpiry = Date.now() + 360 * 60 * 1000
        return true
      }

      return false
    } catch (error) {
      console.error('[EWayBill] Authentication error:', error)
      return false
    }
  }

  /**
   * Ensure we have a valid auth token
   */
  private async ensureAuthenticated(): Promise<boolean> {
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return true
    }
    return await this.authenticate()
  }

  /**
   * Fetch HSN details from E-way Bill API
   */
  protected async fetchFromAPI(code: string): Promise<HSNLookupResult | null> {
    const config = this.config as EWayBillConfig

    // Ensure we're authenticated
    if (!(await this.ensureAuthenticated())) {
      return null
    }

    try {
      const response = await fetch(`${config.baseURL}/v1.03/master/hsn`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          gstin: config.gstin,
          authtoken: this.authToken!,
          ...(config.clientId && { 'client-id': config.clientId }),
          ...(config.clientSecret && { 'client-secret': config.clientSecret })
        }
      })

      if (!response.ok) {
        throw new Error(`HSN lookup failed: ${response.status}`)
      }

      const data: EWayBillHSNResponse = await response.json()

      if (data.status === '1' && data.data) {
        // Note: Response data is encrypted with SEK
        // You would need to decrypt it using the SEK from authentication
        // For now, we're returning a basic structure
        // In production, implement proper decryption

        // The decrypted data should contain HSN code and description
        const hsnData = this.parseHSNData(data.data, code)

        if (hsnData) {
          return {
            code: hsnData.code,
            description: hsnData.description,
            gstRate: hsnData.gstRate,
            source: 'api',
            provider: this.getName()
          }
        }
      }

      return null
    } catch (error) {
      console.error('[EWayBill] HSN lookup error:', error)
      return null
    }
  }

  /**
   * Parse HSN data from encrypted response
   * Note: This is a placeholder - implement proper decryption in production
   */
  private parseHSNData(encryptedData: string, code: string): any {
    // TODO: Implement AES decryption using SEK
    // The E-way Bill API returns encrypted data that needs to be decrypted
    // using the SEK (Session Encryption Key) from authentication
    console.warn('[EWayBill] Encrypted data parsing not implemented yet')
    return null
  }
}

/**
 * Create E-way Bill provider from environment variables
 */
export function createEWayBillProvider(customConfig?: Partial<EWayBillConfig>): EWayBillProvider | null {
  const config: EWayBillConfig = {
    enabled: process.env.EWAYBILL_ENABLED === 'true',
    priority: parseInt(process.env.EWAYBILL_PRIORITY || '1'),
    baseURL: process.env.EWAYBILL_BASE_URL || 'https://api.ewaybillgst.gov.in',
    username: process.env.EWAYBILL_USERNAME || '',
    password: process.env.EWAYBILL_PASSWORD || '',
    appKey: process.env.EWAYBILL_APP_KEY || '',
    gstin: process.env.EWAYBILL_GSTIN || '',
    clientId: process.env.EWAYBILL_CLIENT_ID,
    clientSecret: process.env.EWAYBILL_CLIENT_SECRET,
    timeout: parseInt(process.env.EWAYBILL_TIMEOUT || '5000'),
    cacheEnabled: process.env.EWAYBILL_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.EWAYBILL_CACHE_TTL || String(24 * 60 * 60 * 1000)),
    ...customConfig
  }

  // Only create if credentials are provided
  if (config.username && config.password && config.appKey && config.gstin) {
    return new EWayBillProvider(config)
  }

  return null
}
