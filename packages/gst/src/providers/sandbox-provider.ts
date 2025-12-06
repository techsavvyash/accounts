/**
 * Sandbox.co.in HSN API Provider
 *
 * Integrates with Sandbox.co.in Tax API for India
 * Docs: https://developer.sandbox.co.in/reference/get-hsn-details-api
 *
 * Note: Requires paid subscription (14-day free trial available)
 */

import { HSNAPIProvider, HSNLookupResult, HSNProviderConfig } from '../hsn'

export interface SandboxConfig extends HSNProviderConfig {
  baseURL: string
  apiKey: string
  apiSecret: string
}

interface SandboxHSNResponse {
  hsn_code: string
  description: string
  gst_rate?: number
  cess_rate?: number
  chapter?: string
  // Additional fields from Sandbox API
  [key: string]: any
}

/**
 * Sandbox.co.in HSN API Provider
 */
export class SandboxProvider extends HSNAPIProvider {
  constructor(config: SandboxConfig) {
    super(config)
  }

  getName(): string {
    return 'sandbox'
  }

  /**
   * Fetch HSN details from Sandbox API
   */
  protected async fetchFromAPI(code: string): Promise<HSNLookupResult | null> {
    const config = this.config as SandboxConfig

    try {
      // Construct API endpoint
      const url = `${config.baseURL}/hsn/${code}`

      // Make API request with authentication
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'x-api-secret': config.apiSecret,
          'x-api-version': '2.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          // HSN code not found
          return null
        }
        throw new Error(`HSN lookup failed: ${response.status}`)
      }

      const data: SandboxHSNResponse = await response.json()

      return {
        code: data.hsn_code || code,
        description: data.description || '',
        gstRate: data.gst_rate,
        cess: data.cess_rate,
        chapter: data.chapter,
        source: 'api',
        provider: this.getName()
      }
    } catch (error) {
      console.error('[Sandbox] HSN lookup error:', error)
      return null
    }
  }
}

/**
 * Create Sandbox provider from environment variables
 */
export function createSandboxProvider(customConfig?: Partial<SandboxConfig>): SandboxProvider | null {
  const config: SandboxConfig = {
    enabled: process.env.SANDBOX_ENABLED === 'true',
    priority: parseInt(process.env.SANDBOX_PRIORITY || '2'),
    baseURL: process.env.SANDBOX_BASE_URL || 'https://api.sandbox.co.in/v2',
    apiKey: process.env.SANDBOX_API_KEY || '',
    apiSecret: process.env.SANDBOX_API_SECRET || '',
    timeout: parseInt(process.env.SANDBOX_TIMEOUT || '5000'),
    cacheEnabled: process.env.SANDBOX_CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.SANDBOX_CACHE_TTL || String(24 * 60 * 60 * 1000)),
    ...customConfig
  }

  // Only create if credentials are provided
  if (config.apiKey && config.apiSecret) {
    return new SandboxProvider(config)
  }

  return null
}
