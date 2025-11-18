/**
 * HSN API Integration Example
 *
 * This example demonstrates how to use the HSN API integration with fallback
 * to hard-coded registry data.
 *
 * The system supports:
 * 1. E-way Bill Government API (requires credentials)
 * 2. Sandbox.co.in API (requires subscription)
 * 3. Hard-coded registry data (works without configuration)
 */

import {
  HSNRegistry,
  createEWayBillProvider,
  createSandboxProvider,
  EWayBillProvider,
  SandboxProvider,
  EWayBillConfig,
  SandboxConfig
} from '../src/index'

console.log('='.repeat(80))
console.log('HSN API Integration Example')
console.log('='.repeat(80))

// =============================================================================
// Example 1: Default Usage (Hard-coded Data Only)
// =============================================================================
console.log('\n1. Default Usage - Hard-coded Registry Data')
console.log('-'.repeat(80))

async function example1() {
  // Sync lookup (hard-coded data only)
  const syncResult = HSNRegistry.lookup('8471')
  console.log('Sync lookup (8471):', JSON.stringify(syncResult, null, 2))

  // Async lookup without providers (still uses hard-coded data)
  const asyncResult = await HSNRegistry.lookupAsync('8471')
  console.log('\nAsync lookup (8471):', JSON.stringify(asyncResult, null, 2))
  console.log('Source:', asyncResult.source) // Will be 'fallback'
}

await example1()

// =============================================================================
// Example 2: Using E-way Bill API Provider
// =============================================================================
console.log('\n2. E-way Bill API Provider (Government API)')
console.log('-'.repeat(80))

async function example2() {
  // Auto-create provider from environment variables
  const ewayProvider = createEWayBillProvider()

  if (ewayProvider) {
    console.log('E-way Bill provider created from environment variables')
    HSNRegistry.registerProvider(ewayProvider)
  } else {
    console.log('E-way Bill provider not configured (credentials missing)')
    console.log('To enable, set these environment variables:')
    console.log('  EWAYBILL_ENABLED=true')
    console.log('  EWAYBILL_USERNAME=your_username')
    console.log('  EWAYBILL_PASSWORD=your_password')
    console.log('  EWAYBILL_APP_KEY=your_app_key')
    console.log('  EWAYBILL_GSTIN=your_gstin')

    // Or create manually with custom config
    const customProvider = new EWayBillProvider({
      enabled: true,
      priority: 1,
      baseURL: 'https://api.ewaybillgst.gov.in',
      username: 'your_username',
      password: 'your_password',
      appKey: 'your_app_key',
      gstin: 'your_gstin',
      timeout: 5000,
      cacheEnabled: true,
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    })

    console.log('\nExample of manual provider creation (not registered):')
    console.log('Provider name:', customProvider.getName())
  }

  // Try async lookup (will try API if configured, then fallback)
  const result = await HSNRegistry.lookupAsync('8471')
  console.log('\nLookup result:', JSON.stringify(result, null, 2))
  console.log('Source:', result.source)
  if (result.provider) {
    console.log('Provider:', result.provider)
  }
}

await example2()

// Clear providers for next example
HSNRegistry.clearProviders()

// =============================================================================
// Example 3: Using Sandbox.co.in API Provider
// =============================================================================
console.log('\n3. Sandbox.co.in API Provider (Third-party API)')
console.log('-'.repeat(80))

async function example3() {
  // Auto-create provider from environment variables
  const sandboxProvider = createSandboxProvider()

  if (sandboxProvider) {
    console.log('Sandbox provider created from environment variables')
    HSNRegistry.registerProvider(sandboxProvider)
  } else {
    console.log('Sandbox provider not configured (credentials missing)')
    console.log('To enable, set these environment variables:')
    console.log('  SANDBOX_ENABLED=true')
    console.log('  SANDBOX_API_KEY=your_api_key')
    console.log('  SANDBOX_API_SECRET=your_api_secret')

    // Or create manually with custom config
    const customProvider = new SandboxProvider({
      enabled: true,
      priority: 2,
      baseURL: 'https://api.sandbox.co.in/v2',
      apiKey: 'your_api_key',
      apiSecret: 'your_api_secret',
      timeout: 5000,
      cacheEnabled: true,
      cacheTTL: 24 * 60 * 60 * 1000 // 24 hours
    })

    console.log('\nExample of manual provider creation (not registered):')
    console.log('Provider name:', customProvider.getName())
  }

  // Try async lookup (will try API if configured, then fallback)
  const result = await HSNRegistry.lookupAsync('8471')
  console.log('\nLookup result:', JSON.stringify(result, null, 2))
  console.log('Source:', result.source)
  if (result.provider) {
    console.log('Provider:', result.provider)
  }
}

await example3()

// Clear providers for next example
HSNRegistry.clearProviders()

// =============================================================================
// Example 4: Using Multiple Providers with Priority
// =============================================================================
console.log('\n4. Multiple Providers with Priority')
console.log('-'.repeat(80))

async function example4() {
  console.log('Registering multiple providers...')

  // Create and register Sandbox provider (priority 2)
  const sandboxProvider = new SandboxProvider({
    enabled: true,
    priority: 2, // Lower priority
    baseURL: 'https://api.sandbox.co.in/v2',
    apiKey: 'demo_key',
    apiSecret: 'demo_secret'
  })

  // Create and register E-way Bill provider (priority 1)
  const ewayProvider = new EWayBillProvider({
    enabled: true,
    priority: 1, // Higher priority (tried first)
    baseURL: 'https://api.ewaybillgst.gov.in',
    username: 'demo',
    password: 'demo',
    appKey: 'demo',
    gstin: 'demo'
  })

  // Register in any order - they'll be sorted by priority
  HSNRegistry.registerProvider(sandboxProvider)
  HSNRegistry.registerProvider(ewayProvider)

  const providers = HSNRegistry.getProviders()
  console.log(`Registered ${providers.length} providers`)
  console.log('Providers will be tried in this order:')
  providers.forEach((p, i) => {
    console.log(`  ${i + 1}. ${(p as any).getName()} (priority: ${(p as any).config.priority})`)
  })

  // Lookup will try E-way Bill first, then Sandbox, then fallback to hard-coded data
  const result = await HSNRegistry.lookupAsync('8471')
  console.log('\nLookup result:', JSON.stringify(result, null, 2))
  console.log('Source:', result.source)
  if (result.provider) {
    console.log('Provider used:', result.provider)
  }
}

await example4()

// Clear providers for next example
HSNRegistry.clearProviders()

// =============================================================================
// Example 5: API-Only Mode (No Fallback)
// =============================================================================
console.log('\n5. API-Only Mode (No Fallback to Hard-coded Data)')
console.log('-'.repeat(80))

async function example5() {
  // No providers registered

  // Try lookup with useAPIOnly=true
  const result = await HSNRegistry.lookupAsync('8471', true)
  console.log('Lookup result (API-only, no providers):', JSON.stringify(result, null, 2))
  console.log('Source:', result.source) // Will be 'fallback' with error

  // Now register a provider and try again
  const sandboxProvider = createSandboxProvider({
    enabled: true,
    priority: 1,
    apiKey: 'demo_key',
    apiSecret: 'demo_secret'
  })

  if (sandboxProvider) {
    HSNRegistry.registerProvider(sandboxProvider)
    const result2 = await HSNRegistry.lookupAsync('8471', true)
    console.log('\nWith provider (API-only):', JSON.stringify(result2, null, 2))
    console.log('Source:', result2.source)
  }
}

await example5()

// Clear providers
HSNRegistry.clearProviders()

// =============================================================================
// Example 6: Cache Usage
// =============================================================================
console.log('\n6. Cache Usage')
console.log('-'.repeat(80))

async function example6() {
  const sandboxProvider = new SandboxProvider({
    enabled: true,
    priority: 1,
    baseURL: 'https://api.sandbox.co.in/v2',
    apiKey: 'demo_key',
    apiSecret: 'demo_secret',
    cacheEnabled: true,
    cacheTTL: 60 * 1000 // 1 minute
  })

  HSNRegistry.registerProvider(sandboxProvider)

  console.log('First lookup (will try API):')
  const result1 = await HSNRegistry.lookupAsync('8471')
  console.log('Source:', result1.source)

  console.log('\nSecond lookup (will use cache if first succeeded):')
  const result2 = await HSNRegistry.lookupAsync('8471')
  console.log('Source:', result2.source)

  console.log('\nCache size:', sandboxProvider.getCacheSize())

  // Clear cache
  sandboxProvider.clearCache()
  console.log('Cache cleared. Size:', sandboxProvider.getCacheSize())
}

await example6()

// =============================================================================
// Example 7: Recommended Setup for Production
// =============================================================================
console.log('\n7. Recommended Setup for Production')
console.log('-'.repeat(80))

async function example7() {
  console.log('Best practice: Configure providers at application startup')
  console.log('')
  console.log('// At application startup (e.g., in index.ts or app.ts):')
  console.log('import { HSNRegistry, createEWayBillProvider, createSandboxProvider } from "@/packages/gst"')
  console.log('')
  console.log('// Auto-configure from environment variables')
  console.log('const ewayProvider = createEWayBillProvider()')
  console.log('const sandboxProvider = createSandboxProvider()')
  console.log('')
  console.log('if (ewayProvider) HSNRegistry.registerProvider(ewayProvider)')
  console.log('if (sandboxProvider) HSNRegistry.registerProvider(sandboxProvider)')
  console.log('')
  console.log('// Then use HSNRegistry.lookupAsync() throughout your application')
  console.log('const hsnData = await HSNRegistry.lookupAsync("8471")')
  console.log('')
  console.log('Benefits:')
  console.log('  - Works immediately with hard-coded data (no API required)')
  console.log('  - Automatically uses API if credentials are configured')
  console.log('  - Falls back to hard-coded data if API fails')
  console.log('  - Built-in caching reduces API calls')
  console.log('  - Easy to add more providers in the future')
}

await example7()

console.log('\n' + '='.repeat(80))
console.log('HSN API Integration Example Complete')
console.log('='.repeat(80))
