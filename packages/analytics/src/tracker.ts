import { PostHog } from 'posthog-node'
import {
  BusinessEvent,
  BaseEventProperties,
  UserProperties,
  TenantProperties,
  EventProperties,
  TrackingError,
  ErrorDetails,
  PerformanceMetrics,
  FeatureFlag
} from './types'

/**
 * Enhanced Analytics Tracker with business-specific event tracking
 */
export class AnalyticsTracker {
  private posthog: PostHog | null = null
  private config: {
    apiKey?: string
    host?: string
    enabled?: boolean
    debug?: boolean
  }

  constructor(config: {
    apiKey?: string
    host?: string
    enabled?: boolean
    debug?: boolean
  }) {
    this.config = config

    if (config.apiKey && config.enabled !== false) {
      try {
        this.posthog = new PostHog(config.apiKey, {
          host: config.host || 'https://app.posthog.com',
          flushAt: 20,
          flushInterval: 10000,
          personalApiKey: undefined,
          featureFlagsPollingInterval: 30000,
          disabled: !config.enabled
        })
      } catch (error) {
        console.error('Failed to initialize PostHog:', error)
        if (config.debug) {
          throw new TrackingError('PostHog initialization failed', { error })
        }
      }
    }
  }

  /**
   * Track a business event with enhanced context
   */
  track(
    event: BusinessEvent | string,
    properties: EventProperties & Partial<BaseEventProperties> = {},
    context: {
      userId?: string
      tenantId?: string
      sessionId?: string
      distinctId?: string
    } = {}
  ): void {
    if (!this.posthog) {
      if (this.config.debug) {
        console.warn('PostHog not initialized, skipping event:', event)
      }
      return
    }

    try {
      const distinctId = context.distinctId || this.generateDistinctId(context.tenantId, context.userId)
      
      const enrichedProperties = this.enrichProperties(properties, context)

      this.posthog.capture({
        distinctId,
        event,
        properties: enrichedProperties,
        timestamp: new Date()
      })

      if (this.config.debug) {
        console.log(`📊 Tracked event: ${event}`, {
          distinctId,
          properties: enrichedProperties
        })
      }
    } catch (error) {
      console.error('Failed to track event:', error)
      if (this.config.debug) {
        throw new TrackingError('Event tracking failed', { event, error })
      }
    }
  }

  /**
   * Identify a user with properties
   */
  identify(
    userId: string,
    properties: UserProperties = {},
    context: { tenantId?: string } = {}
  ): void {
    if (!this.posthog) return

    try {
      const distinctId = this.generateDistinctId(context.tenantId, userId)

      this.posthog.identify({
        distinctId,
        properties: {
          ...properties,
          identifiedAt: new Date().toISOString()
        }
      })

      if (this.config.debug) {
        console.log(`👤 Identified user: ${userId}`, properties)
      }
    } catch (error) {
      console.error('Failed to identify user:', error)
      if (this.config.debug) {
        throw new TrackingError('User identification failed', { userId, error })
      }
    }
  }

  /**
   * Identify a tenant/organization
   */
  identifyTenant(
    tenantId: string,
    properties: TenantProperties
  ): void {
    if (!this.posthog) return

    try {
      this.posthog.groupIdentify({
        groupType: 'tenant',
        groupKey: tenantId,
        properties: {
          ...properties,
          identifiedAt: new Date().toISOString()
        }
      })

      if (this.config.debug) {
        console.log(`🏢 Identified tenant: ${tenantId}`, properties)
      }
    } catch (error) {
      console.error('Failed to identify tenant:', error)
      if (this.config.debug) {
        throw new TrackingError('Tenant identification failed', { tenantId, error })
      }
    }
  }

  /**
   * Create an alias for a user (useful for connecting anonymous to identified users)
   */
  alias(alias: string, distinctId?: string, context: { tenantId?: string, userId?: string } = {}): void {
    if (!this.posthog) return

    try {
      this.posthog.alias({
        alias,
        distinctId: distinctId || this.generateDistinctId(context.tenantId, context.userId)
      })

      if (this.config.debug) {
        console.log(`🔗 Created alias: ${alias} -> ${distinctId}`)
      }
    } catch (error) {
      console.error('Failed to create alias:', error)
      if (this.config.debug) {
        throw new TrackingError('Alias creation failed', { alias, error })
      }
    }
  }

  /**
   * Track page views with enhanced context
   */
  trackPageView(
    url: string,
    properties: Record<string, any> = {},
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(BusinessEvent.PAGE_LOAD, {
      $current_url: url,
      ...properties
    }, context)
  }

  /**
   * Track API calls with performance metrics
   */
  trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    const isError = statusCode >= 400

    this.track(isError ? BusinessEvent.API_ERROR : BusinessEvent.API_CALL, {
      endpoint,
      method,
      statusCode,
      duration,
      isError,
      responseTime: duration
    }, context)
  }

  /**
   * Track errors with detailed context
   */
  trackError(
    error: Error | string,
    details: Partial<ErrorDetails> = {},
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'object' ? error.stack : undefined

    this.track(BusinessEvent.ERROR_OCCURRED, {
      error: errorMessage,
      errorStack,
      severity: details.severity || 'medium',
      category: details.category || 'other',
      userImpact: details.userImpact || false,
      ...details.context
    }, context)
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: PerformanceMetrics, context: { tenantId?: string } = {}): void {
    this.track('performance.metrics', {
      endpoint: metrics.endpoint,
      averageResponseTime: metrics.averageResponseTime,
      p95ResponseTime: metrics.p95ResponseTime,
      p99ResponseTime: metrics.p99ResponseTime,
      requestCount: metrics.requestCount,
      errorRate: metrics.errorRate,
      throughput: metrics.throughput,
      slowQueryCount: metrics.slowQueries?.length || 0
    }, context)
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(
    feature: string,
    action: string,
    properties: Record<string, any> = {},
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(BusinessEvent.FEATURE_USED, {
      feature,
      action,
      ...properties
    }, context)
  }

  /**
   * Track business-specific events with validation
   */
  trackInvoiceEvent(
    event: BusinessEvent,
    invoiceData: {
      invoiceId: string
      invoiceNumber: string
      customerId: string
      totalAmount: number
      status: string
      [key: string]: any
    },
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(event, invoiceData, context)
  }

  trackCustomerEvent(
    event: BusinessEvent,
    customerData: {
      customerId: string
      customerName: string
      [key: string]: any
    },
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(event, customerData, context)
  }

  trackInventoryEvent(
    event: BusinessEvent,
    inventoryData: {
      inventoryItemId: string
      sku: string
      name: string
      [key: string]: any
    },
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(event, inventoryData, context)
  }

  trackGSTEvent(
    event: BusinessEvent,
    gstData: {
      amount?: number
      gstRate?: number
      gstin?: string
      [key: string]: any
    },
    context: { userId?: string; tenantId?: string } = {}
  ): void {
    this.track(event, gstData, context)
  }

  /**
   * Check if a feature flag is enabled for a user
   */
  async isFeatureEnabled(
    flagKey: string,
    context: { userId?: string; tenantId?: string } = {},
    defaultValue: boolean = false
  ): Promise<boolean> {
    if (!this.posthog) return defaultValue

    try {
      const distinctId = this.generateDistinctId(context.tenantId, context.userId)
      
      const isEnabled = await this.posthog.isFeatureEnabled(
        flagKey,
        distinctId,
        {
          groups: context.tenantId ? { tenant: context.tenantId } : undefined
        }
      )

      return isEnabled ?? defaultValue
    } catch (error) {
      console.error('Failed to check feature flag:', error)
      return defaultValue
    }
  }

  /**
   * Get feature flag payload
   */
  async getFeatureFlag(
    flagKey: string,
    context: { userId?: string; tenantId?: string } = {}
  ): Promise<string | boolean | object | undefined> {
    if (!this.posthog) return undefined

    try {
      const distinctId = this.generateDistinctId(context.tenantId, context.userId)
      
      return await this.posthog.getFeatureFlag(
        flagKey,
        distinctId,
        {
          groups: context.tenantId ? { tenant: context.tenantId } : undefined
        }
      )
    } catch (error) {
      console.error('Failed to get feature flag:', error)
      return undefined
    }
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (!this.posthog) return

    try {
      await this.posthog.flush()
    } catch (error) {
      console.error('Failed to flush events:', error)
      if (this.config.debug) {
        throw new TrackingError('Event flush failed', { error })
      }
    }
  }

  /**
   * Shutdown the tracker and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (!this.posthog) return

    try {
      await this.posthog.shutdown()
      this.posthog = null
    } catch (error) {
      console.error('Failed to shutdown PostHog:', error)
      if (this.config.debug) {
        throw new TrackingError('PostHog shutdown failed', { error })
      }
    }
  }

  /**
   * Generate a consistent distinct ID for tracking
   */
  private generateDistinctId(tenantId?: string, userId?: string): string {
    if (tenantId && userId) {
      return `${tenantId}_${userId}`
    }
    if (userId) {
      return userId
    }
    if (tenantId) {
      return `tenant_${tenantId}`
    }
    return 'anonymous'
  }

  /**
   * Enrich event properties with additional context
   */
  private enrichProperties(
    properties: EventProperties & Partial<BaseEventProperties>,
    context: { userId?: string; tenantId?: string; sessionId?: string }
  ): Record<string, any> {
    return {
      ...properties,
      timestamp: properties.timestamp || new Date().toISOString(),
      userId: properties.userId || context.userId,
      tenantId: properties.tenantId || context.tenantId,
      sessionId: properties.sessionId || context.sessionId,
      // Add SDK information
      $lib: 'accounts-analytics',
      $lib_version: '1.0.0'
    }
  }

  /**
   * Check if tracking is enabled and configured
   */
  isEnabled(): boolean {
    return this.posthog !== null
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config }
  }
}