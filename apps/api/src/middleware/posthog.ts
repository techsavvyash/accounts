import { AnalyticsTracker, BusinessEvent } from '@accounts/analytics'
import { config } from '../config'

let analyticsTracker: AnalyticsTracker | null = null

if (config.POSTHOG_API_KEY) {
  analyticsTracker = new AnalyticsTracker({
    apiKey: config.POSTHOG_API_KEY,
    host: config.POSTHOG_HOST,
    enabled: config.NODE_ENV !== 'test',
    debug: config.NODE_ENV === 'development'
  })
}

export const posthogMiddleware = ({ request, store }: any) => {
  const context = {
    userId: store.userId,
    tenantId: store.tenantId,
    sessionId: request.headers['x-session-id']
  }

  const trackEvent = (event: string, properties: Record<string, any> = {}) => {
    if (!analyticsTracker) return
    
    analyticsTracker.track(event, {
      ...properties,
      path: request.url,
      method: request.method,
      userAgent: request.headers['user-agent'],
      roleName: store.roleName,
      tenant: store.tenant?.name
    }, context)
  }

  const trackApiCall = (endpoint: string, statusCode: number, duration: number) => {
    if (!analyticsTracker) return
    
    analyticsTracker.trackApiCall(endpoint, request.method, statusCode, duration, context)
  }

  const trackError = (error: Error | string, details?: any) => {
    if (!analyticsTracker) return
    
    analyticsTracker.trackError(error, {
      ...details,
      endpoint: request.url,
      method: request.method,
      severity: 'medium'
    }, context)
  }

  const trackFeatureUsage = (feature: string, action: string, properties?: Record<string, any>) => {
    if (!analyticsTracker) return
    
    analyticsTracker.trackFeatureUsage(feature, action, properties, context)
  }

  return {
    posthog: {
      track: trackEvent,
      trackApiCall,
      trackError,
      trackFeatureUsage,
      trackPageView: (url?: string) => {
        if (!analyticsTracker) return
        analyticsTracker.trackPageView(url || request.url, {}, context)
      },
      identify: (userId: string, properties?: Record<string, any>) => {
        if (!analyticsTracker) return
        analyticsTracker.identify(userId, {
          ...properties,
          role: store.roleName,
          tenant: store.tenant?.name
        }, { tenantId: store.tenantId })
      },
      identifyTenant: (tenantId: string, properties: Record<string, any>) => {
        if (!analyticsTracker) return
        analyticsTracker.identifyTenant(tenantId, properties)
      },
      alias: (alias: string, distinctId?: string) => {
        if (!analyticsTracker) return
        analyticsTracker.alias(alias, distinctId, context)
      },
      flush: async () => {
        if (!analyticsTracker) return
        await analyticsTracker.flush()
      },
      isFeatureEnabled: async (flagKey: string, defaultValue = false) => {
        if (!analyticsTracker) return defaultValue
        return await analyticsTracker.isFeatureEnabled(flagKey, context, defaultValue)
      },
      getFeatureFlag: async (flagKey: string) => {
        if (!analyticsTracker) return undefined
        return await analyticsTracker.getFeatureFlag(flagKey, context)
      }
    }
  }
}

export const autoTrackMiddleware = ({ request, store, posthog }: any) => {
  const startTime = Date.now()
  
  return {
    onAfterHandle: ({ response }: any) => {
      const duration = Date.now() - startTime
      const statusCode = response?.status || 200
      
      posthog.trackApiCall(request.url, statusCode, duration)
      
      // Track specific business events based on endpoints
      const url = request.url
      const method = request.method
      
      if (method === 'POST') {
        if (url.includes('/invoices')) {
          posthog.track(BusinessEvent.INVOICE_CREATED, { endpoint: url, duration })
        } else if (url.includes('/customers')) {
          posthog.track(BusinessEvent.CUSTOMER_CREATED, { endpoint: url, duration })
        } else if (url.includes('/inventory')) {
          posthog.track(BusinessEvent.INVENTORY_ITEM_CREATED, { endpoint: url, duration })
        } else if (url.includes('/auth/login')) {
          posthog.track(BusinessEvent.USER_LOGIN, { endpoint: url, duration })
        } else if (url.includes('/auth/register')) {
          posthog.track(BusinessEvent.USER_REGISTERED, { endpoint: url, duration })
        }
      } else if (method === 'PUT') {
        if (url.includes('/invoices/')) {
          posthog.track(BusinessEvent.INVOICE_UPDATED, { endpoint: url, duration })
        } else if (url.includes('/customers/')) {
          posthog.track(BusinessEvent.CUSTOMER_UPDATED, { endpoint: url, duration })
        } else if (url.includes('/inventory/')) {
          posthog.track(BusinessEvent.INVENTORY_ITEM_UPDATED, { endpoint: url, duration })
        }
      } else if (method === 'DELETE') {
        if (url.includes('/customers/')) {
          posthog.track(BusinessEvent.CUSTOMER_DELETED, { endpoint: url, duration })
        } else if (url.includes('/inventory/')) {
          posthog.track(BusinessEvent.INVENTORY_ITEM_DELETED, { endpoint: url, duration })
        }
      }

      // Track GST-related events
      if (url.includes('/gst/')) {
        if (url.includes('/calculate')) {
          posthog.track(BusinessEvent.GST_CALCULATION_PERFORMED, { endpoint: url, duration })
        } else if (url.includes('/validate')) {
          posthog.track(BusinessEvent.GSTIN_VALIDATED, { endpoint: url, duration })
        } else if (url.includes('/gstr1')) {
          posthog.track(BusinessEvent.GSTR1_GENERATED, { endpoint: url, duration })
        } else if (url.includes('/gstr3b')) {
          posthog.track(BusinessEvent.GSTR3B_GENERATED, { endpoint: url, duration })
        }
      }

      // Track financial report generation
      if (url.includes('/reports/')) {
        if (url.includes('/trial-balance')) {
          posthog.track(BusinessEvent.TRIAL_BALANCE_GENERATED, { endpoint: url, duration })
        } else if (url.includes('/profit-loss')) {
          posthog.track(BusinessEvent.PROFIT_LOSS_GENERATED, { endpoint: url, duration })
        } else if (url.includes('/balance-sheet')) {
          posthog.track(BusinessEvent.BALANCE_SHEET_GENERATED, { endpoint: url, duration })
        }
      }
    },
    onError: ({ error }: any) => {
      const duration = Date.now() - startTime
      
      posthog.trackError(error, {
        endpoint: request.url,
        method: request.method,
        duration,
        category: 'api',
        userImpact: true
      })
    }
  }
}

export const shutdownPostHog = async () => {
  if (analyticsTracker) {
    await analyticsTracker.shutdown()
  }
}

export const trackEvent = (
  event: string,
  properties: Record<string, any> = {},
  userId?: string,
  tenantId?: string
) => {
  if (!analyticsTracker) return
  
  analyticsTracker.track(event, properties, { userId, tenantId })
}

export const trackInvoiceEvent = (
  event: string,
  invoiceData: {
    invoiceId: string
    invoiceNumber: string
    customerId: string
    totalAmount: number
    status: string
    [key: string]: any
  },
  userId?: string,
  tenantId?: string
) => {
  if (!analyticsTracker) return
  
  analyticsTracker.trackInvoiceEvent(event, invoiceData, { userId, tenantId })
}

export const trackCustomerEvent = (
  event: string,
  customerData: {
    customerId: string
    customerName: string
    [key: string]: any
  },
  userId?: string,
  tenantId?: string
) => {
  if (!analyticsTracker) return
  
  analyticsTracker.trackCustomerEvent(event, customerData, { userId, tenantId })
}

export const trackGSTEvent = (
  event: string,
  gstData: {
    amount?: number
    gstRate?: number
    gstin?: string
    [key: string]: any
  },
  userId?: string,
  tenantId?: string
) => {
  if (!analyticsTracker) return
  
  analyticsTracker.trackGSTEvent(event, gstData, { userId, tenantId })
}

export { analyticsTracker }