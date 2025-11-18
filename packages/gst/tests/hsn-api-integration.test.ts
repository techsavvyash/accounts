import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { HSNRegistry } from '../src/hsn-registry'
import { HSNAPIProvider, HSNLookupResult, HSNProviderConfig } from '../src/hsn-api-provider'
import { EWayBillProvider } from '../src/providers/ewaybill-provider'
import { SandboxProvider } from '../src/providers/sandbox-provider'

/**
 * Mock HSN API Provider for testing
 */
class MockHSNProvider extends HSNAPIProvider {
  private mockData: Map<string, HSNLookupResult> = new Map()
  private shouldFail: boolean = false

  constructor(config: HSNProviderConfig) {
    super(config)
  }

  getName(): string {
    return 'mock'
  }

  protected async fetchFromAPI(code: string): Promise<HSNLookupResult | null> {
    if (this.shouldFail) {
      throw new Error('Mock API failure')
    }

    return this.mockData.get(code) || null
  }

  // Test helpers
  setMockData(code: string, result: HSNLookupResult): void {
    this.mockData.set(code, result)
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail
  }
}

describe('HSN API Integration', () => {
  beforeEach(() => {
    // Clear providers before each test
    HSNRegistry.clearProviders()
  })

  afterEach(() => {
    // Clean up after each test
    HSNRegistry.clearProviders()
  })

  describe('Provider Registration', () => {
    test('should register a provider', () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      HSNRegistry.registerProvider(provider)

      const providers = HSNRegistry.getProviders()
      expect(providers.length).toBe(1)
    })

    test('should register multiple providers', () => {
      const provider1 = new MockHSNProvider({ enabled: true, priority: 1 })
      const provider2 = new MockHSNProvider({ enabled: true, priority: 2 })

      HSNRegistry.registerProvider(provider1)
      HSNRegistry.registerProvider(provider2)

      const providers = HSNRegistry.getProviders()
      expect(providers.length).toBe(2)
    })

    test('should sort providers by priority', () => {
      const provider1 = new MockHSNProvider({ enabled: true, priority: 3 })
      const provider2 = new MockHSNProvider({ enabled: true, priority: 1 })
      const provider3 = new MockHSNProvider({ enabled: true, priority: 2 })

      // Register in random order
      HSNRegistry.registerProvider(provider1)
      HSNRegistry.registerProvider(provider2)
      HSNRegistry.registerProvider(provider3)

      const providers = HSNRegistry.getProviders()
      expect(providers.length).toBe(3)
      expect((providers[0] as any).config.priority).toBe(1)
      expect((providers[1] as any).config.priority).toBe(2)
      expect((providers[2] as any).config.priority).toBe(3)
    })

    test('should clear all providers', () => {
      const provider1 = new MockHSNProvider({ enabled: true, priority: 1 })
      const provider2 = new MockHSNProvider({ enabled: true, priority: 2 })

      HSNRegistry.registerProvider(provider1)
      HSNRegistry.registerProvider(provider2)
      expect(HSNRegistry.getProviders().length).toBe(2)

      HSNRegistry.clearProviders()
      expect(HSNRegistry.getProviders().length).toBe(0)
    })
  })

  describe('Async Lookup with API', () => {
    test('should use API provider when available', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      provider.setMockData('9999', {
        code: '9999',
        description: 'Test Product from API',
        gstRate: 18,
        source: 'api',
        provider: 'mock'
      })

      HSNRegistry.registerProvider(provider)

      const result = await HSNRegistry.lookupAsync('9999')
      expect(result.isValid).toBe(true)
      expect(result.code).toBe('9999')
      expect(result.description).toBe('Test Product from API')
      expect(result.source).toBe('api')
      expect(result.provider).toBe('mock')
    })

    test('should fallback to hard-coded data when API fails', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      provider.setShouldFail(true)

      HSNRegistry.registerProvider(provider)

      // Lookup existing hard-coded code
      const result = await HSNRegistry.lookupAsync('8471')
      expect(result.isValid).toBe(true)
      expect(result.source).toBe('fallback')
    })

    test('should fallback when API returns null', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      // Don't set any mock data, so it returns null

      HSNRegistry.registerProvider(provider)

      const result = await HSNRegistry.lookupAsync('8471')
      expect(result.isValid).toBe(true)
      expect(result.source).toBe('fallback')
    })

    test('should try providers in priority order', async () => {
      const provider1 = new MockHSNProvider({ enabled: true, priority: 2 })
      provider1.setMockData('9999', {
        code: '9999',
        description: 'From Provider 1',
        source: 'api',
        provider: 'mock'
      })

      const provider2 = new MockHSNProvider({ enabled: true, priority: 1 })
      provider2.setMockData('9999', {
        code: '9999',
        description: 'From Provider 2',
        source: 'api',
        provider: 'mock'
      })

      HSNRegistry.registerProvider(provider1)
      HSNRegistry.registerProvider(provider2)

      const result = await HSNRegistry.lookupAsync('9999')
      // Should use provider2 (priority 1)
      expect(result.description).toBe('From Provider 2')
    })

    test('should work without any providers (hard-coded only)', async () => {
      // No providers registered

      const result = await HSNRegistry.lookupAsync('8471')
      expect(result.isValid).toBe(true)
      expect(result.source).toBe('fallback')
    })

    test('should handle invalid codes', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      HSNRegistry.registerProvider(provider)

      const result = await HSNRegistry.lookupAsync('X')
      expect(result.isValid).toBe(false)
      expect(result.source).toBe('fallback')
    })
  })

  describe('API-Only Mode', () => {
    test('should not fallback when useAPIOnly is true', async () => {
      // No providers registered

      const result = await HSNRegistry.lookupAsync('8471', true)
      expect(result.isValid).toBe(false)
      expect(result.description).toContain('Not found in API providers')
    })

    test('should use API when available in API-only mode', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      provider.setMockData('9999', {
        code: '9999',
        description: 'API Result',
        source: 'api',
        provider: 'mock'
      })

      HSNRegistry.registerProvider(provider)

      const result = await HSNRegistry.lookupAsync('9999', true)
      expect(result.isValid).toBe(true)
      expect(result.description).toBe('API Result')
      expect(result.source).toBe('api')
    })

    test('should fail when API fails in API-only mode', async () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      provider.setShouldFail(true)

      HSNRegistry.registerProvider(provider)

      const result = await HSNRegistry.lookupAsync('8471', true)
      expect(result.isValid).toBe(false)
    })
  })

  describe('Provider Caching', () => {
    test('should cache API responses', async () => {
      const provider = new MockHSNProvider({
        enabled: true,
        priority: 1,
        cacheEnabled: true,
        cacheTTL: 60000
      })

      provider.setMockData('9999', {
        code: '9999',
        description: 'Cached Result',
        source: 'api',
        provider: 'mock'
      })

      // First call - from API
      const result1 = await provider.lookup('9999')
      expect(result1?.source).toBe('api')

      // Second call - from cache
      const result2 = await provider.lookup('9999')
      expect(result2?.source).toBe('cache')
    })

    test('should respect cache TTL', async () => {
      const provider = new MockHSNProvider({
        enabled: true,
        priority: 1,
        cacheEnabled: true,
        cacheTTL: 100 // 100ms
      })

      provider.setMockData('9999', {
        code: '9999',
        description: 'Result',
        source: 'api',
        provider: 'mock'
      })

      // First call
      await provider.lookup('9999')
      expect(provider.getCacheSize()).toBe(1)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Second call after expiry - should fetch from API again
      const result = await provider.lookup('9999')
      expect(result?.source).toBe('api') // Not from cache
    })

    test('should clear cache', async () => {
      const provider = new MockHSNProvider({
        enabled: true,
        priority: 1,
        cacheEnabled: true
      })

      provider.setMockData('9999', {
        code: '9999',
        description: 'Result',
        source: 'api',
        provider: 'mock'
      })

      await provider.lookup('9999')
      expect(provider.getCacheSize()).toBe(1)

      provider.clearCache()
      expect(provider.getCacheSize()).toBe(0)
    })

    test('should not cache when disabled', async () => {
      const provider = new MockHSNProvider({
        enabled: true,
        priority: 1,
        cacheEnabled: false
      })

      provider.setMockData('9999', {
        code: '9999',
        description: 'Result',
        source: 'api',
        provider: 'mock'
      })

      await provider.lookup('9999')
      await provider.lookup('9999')
      expect(provider.getCacheSize()).toBe(0)
    })
  })

  describe('Provider Timeout', () => {
    test('should timeout slow API calls', async () => {
      class SlowProvider extends HSNAPIProvider {
        constructor(config: HSNProviderConfig) {
          super(config)
        }

        getName(): string {
          return 'slow'
        }

        protected async fetchFromAPI(code: string): Promise<HSNLookupResult | null> {
          // Simulate slow API
          await new Promise(resolve => setTimeout(resolve, 10000))
          return { code, description: 'Slow result', source: 'api' }
        }
      }

      const provider = new SlowProvider({
        enabled: true,
        priority: 1,
        timeout: 100 // 100ms timeout
      })

      HSNRegistry.registerProvider(provider)

      // Should timeout and fallback
      const result = await HSNRegistry.lookupAsync('8471')
      expect(result.source).toBe('fallback')
    })
  })

  describe('Backward Compatibility', () => {
    test('sync lookup should still work', () => {
      // Register API provider
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      HSNRegistry.registerProvider(provider)

      // Sync lookup should ignore API and use hard-coded data
      const result = HSNRegistry.lookup('8471')
      expect(result.isValid).toBe(true)
      expect(result.code).toBe('8471')
    })

    test('existing methods should not be affected', () => {
      const provider = new MockHSNProvider({ enabled: true, priority: 1 })
      HSNRegistry.registerProvider(provider)

      // All existing methods should work as before
      expect(HSNRegistry.getAllChapters().length).toBeGreaterThan(0)
      expect(HSNRegistry.getChapter('84')).toBeDefined()
      expect(HSNRegistry.findByCode('8471')).toBeDefined()
      expect(HSNRegistry.searchByDescription('laptop').length).toBeGreaterThan(0)
      expect(HSNRegistry.getByChapter('84').length).toBeGreaterThan(0)
      expect(HSNRegistry.getByGSTRate(18).length).toBeGreaterThan(0)
    })
  })

  describe('Provider Implementations', () => {
    test('EWayBillProvider should be instantiable', () => {
      const provider = new EWayBillProvider({
        enabled: true,
        priority: 1,
        baseURL: 'https://test.api.com',
        username: 'test',
        password: 'test',
        appKey: 'test',
        gstin: 'test'
      })

      expect(provider.getName()).toBe('ewaybill')
    })

    test('SandboxProvider should be instantiable', () => {
      const provider = new SandboxProvider({
        enabled: true,
        priority: 1,
        baseURL: 'https://test.api.com',
        apiKey: 'test',
        apiSecret: 'test'
      })

      expect(provider.getName()).toBe('sandbox')
    })
  })
})
