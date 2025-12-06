/**
 * HSN API Provider Interface
 *
 * Provides a plugin-based architecture for integrating external HSN APIs
 * with fallback to hard-coded registry data.
 */

import { HSNCode } from './hsn-registry'

/**
 * HSN lookup result from API
 */
export interface HSNLookupResult {
  code: string
  description: string
  gstRate?: number
  cess?: number
  unit?: string
  chapter?: string
  source: 'api' | 'cache' | 'fallback'
  provider?: string
}

/**
 * HSN API Provider Configuration
 */
export interface HSNProviderConfig {
  enabled: boolean
  priority: number // Lower number = higher priority (1 is highest)
  timeout?: number // Request timeout in milliseconds
  cacheEnabled?: boolean
  cacheTTL?: number // Cache TTL in milliseconds
  [key: string]: any // Provider-specific config
}

/**
 * Abstract HSN API Provider
 */
export abstract class HSNAPIProvider {
  protected config: HSNProviderConfig
  protected cache: Map<string, { data: HSNLookupResult; timestamp: number }> = new Map()

  constructor(config: HSNProviderConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours default
      timeout: 5000, // 5 seconds default
      ...config
    }
  }

  /**
   * Get provider name
   */
  abstract getName(): string

  /**
   * Lookup HSN code from API
   */
  protected abstract fetchFromAPI(code: string): Promise<HSNLookupResult | null>

  /**
   * Lookup HSN code with caching
   */
  async lookup(code: string): Promise<HSNLookupResult | null> {
    if (!this.config.enabled) {
      return null
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(code)
      if (cached && Date.now() - cached.timestamp < (this.config.cacheTTL || 0)) {
        return { ...cached.data, source: 'cache' }
      }
    }

    try {
      // Fetch from API with timeout
      const result = await Promise.race([
        this.fetchFromAPI(code),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        )
      ])

      if (result) {
        // Cache the result
        if (this.config.cacheEnabled) {
          this.cache.set(code, { data: result, timestamp: Date.now() })
        }
        return { ...result, source: 'api', provider: this.getName() }
      }

      return null
    } catch (error) {
      console.error(`[${this.getName()}] HSN API lookup failed:`, error)
      return null
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }
}
