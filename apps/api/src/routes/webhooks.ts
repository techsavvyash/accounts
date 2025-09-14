import { Elysia, t } from 'elysia'
import { WebhookEventType } from '@accounts/webhooks'
import { 
  webhookManager,
  createWebhookEndpoint,
  getWebhookEndpoints,
  getWebhookStats,
  publishWebhookEvent
} from '../services/webhook'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/rbac'

export const webhooksRoutes = new Elysia({ prefix: '/webhooks' })
  
  // Get all webhook endpoints for the tenant
  .get('/', async ({ store }) => {
    const endpoints = await getWebhookEndpoints(store.tenantId)
    return { 
      success: true, 
      data: endpoints.map(endpoint => ({
        ...endpoint,
        secret: '***' // Hide secret in responses
      }))
    }
  }, {
    detail: {
      summary: 'Get webhook endpoints',
      description: 'Retrieve all webhook endpoints for the current tenant',
      tags: ['Webhooks']
    }
  })
  
  // Create a new webhook endpoint
  .post('/', async ({ body, store }) => {
    const endpoint = await createWebhookEndpoint(
      store.tenantId,
      body.url,
      body.events,
      {
        description: body.description,
        headers: body.headers,
        timeout: body.timeout
      }
    )
    
    return { 
      success: true, 
      data: endpoint,
      message: 'Webhook endpoint created successfully'
    }
  }, {
    body: t.Object({
      url: t.String({ format: 'uri', description: 'Webhook endpoint URL' }),
      events: t.Array(t.Enum(WebhookEventType), { 
        description: 'List of events to subscribe to',
        minItems: 1 
      }),
      description: t.Optional(t.String({ description: 'Optional description for the webhook' })),
      headers: t.Optional(t.Record(t.String(), t.String(), { 
        description: 'Optional custom headers to include in webhook requests' 
      })),
      timeout: t.Optional(t.Integer({ 
        minimum: 1000, 
        maximum: 60000,
        description: 'Request timeout in milliseconds (1s-60s)' 
      }))
    }),
    detail: {
      summary: 'Create webhook endpoint',
      description: 'Create a new webhook endpoint for receiving event notifications',
      tags: ['Webhooks']
    }
  })
  
  // Get webhook endpoint details
  .get('/:id', async ({ params, store }) => {
    const endpoint = await webhookManager.getEndpoint(params.id)
    
    if (!endpoint) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    // Ensure user can only access their tenant's endpoints
    if (endpoint.tenantId !== store.tenantId) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    return {
      success: true,
      data: {
        ...endpoint,
        secret: '***' // Hide secret
      }
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Webhook endpoint ID' })
    }),
    detail: {
      summary: 'Get webhook endpoint',
      description: 'Retrieve details of a specific webhook endpoint',
      tags: ['Webhooks']
    }
  })
  
  // Update webhook endpoint
  .put('/:id', async ({ params, body, store }) => {
    const existing = await webhookManager.getEndpoint(params.id)
    
    if (!existing || existing.tenantId !== store.tenantId) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    const updated = await webhookManager.updateEndpoint(params.id, body)
    
    return {
      success: true,
      data: {
        ...updated,
        secret: '***'
      },
      message: 'Webhook endpoint updated successfully'
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Webhook endpoint ID' })
    }),
    body: t.Object({
      url: t.Optional(t.String({ format: 'uri' })),
      events: t.Optional(t.Array(t.Enum(WebhookEventType), { minItems: 1 })),
      isActive: t.Optional(t.Boolean()),
      description: t.Optional(t.String()),
      headers: t.Optional(t.Record(t.String(), t.String())),
      timeout: t.Optional(t.Integer({ minimum: 1000, maximum: 60000 }))
    }),
    detail: {
      summary: 'Update webhook endpoint',
      description: 'Update an existing webhook endpoint configuration',
      tags: ['Webhooks']
    }
  })
  
  // Delete webhook endpoint
  .delete('/:id', async ({ params, store }) => {
    const existing = await webhookManager.getEndpoint(params.id)
    
    if (!existing || existing.tenantId !== store.tenantId) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    await webhookManager.deleteEndpoint(params.id)
    
    return {
      success: true,
      message: 'Webhook endpoint deleted successfully'
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Webhook endpoint ID' })
    }),
    detail: {
      summary: 'Delete webhook endpoint',
      description: 'Delete a webhook endpoint',
      tags: ['Webhooks']
    }
  })
  
  // Get webhook endpoint statistics
  .get('/:id/stats', async ({ params, store }) => {
    const endpoint = await webhookManager.getEndpoint(params.id)
    
    if (!endpoint || endpoint.tenantId !== store.tenantId) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    const stats = await getWebhookStats(params.id)
    
    return {
      success: true,
      data: stats
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Webhook endpoint ID' })
    }),
    detail: {
      summary: 'Get webhook statistics',
      description: 'Retrieve delivery statistics for a webhook endpoint',
      tags: ['Webhooks']
    }
  })
  
  // Test webhook endpoint
  .post('/:id/test', async ({ params, store }) => {
    const endpoint = await webhookManager.getEndpoint(params.id)
    
    if (!endpoint || endpoint.tenantId !== store.tenantId) {
      return {
        success: false,
        error: 'Webhook endpoint not found'
      }
    }
    
    try {
      // Send a test event
      await publishWebhookEvent(
        WebhookEventType.CUSTOMER_CREATED,
        {
          customerId: 'test_customer_123',
          name: 'Test Customer',
          email: 'test@example.com'
        },
        store.tenantId,
        store.userId
      )
      
      return {
        success: true,
        message: 'Test webhook sent successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send test webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Webhook endpoint ID' })
    }),
    detail: {
      summary: 'Test webhook endpoint',
      description: 'Send a test event to the webhook endpoint to verify connectivity',
      tags: ['Webhooks']
    }
  })
  
  // Webhook events reference (GET /webhooks/events)
  .get('/events', () => {
    const eventTypes = Object.entries(WebhookEventType).map(([key, value]) => ({
      key,
      value,
      category: value.split('.')[0],
      description: getEventDescription(value as WebhookEventType)
    }))
    
    const categorized = eventTypes.reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = []
      }
      acc[event.category].push({
        key: event.key,
        value: event.value,
        description: event.description
      })
      return acc
    }, {} as Record<string, any[]>)
    
    return {
      success: true,
      data: {
        events: eventTypes,
        categorized
      }
    }
  }, {
    detail: {
      summary: 'Get available webhook events',
      description: 'Retrieve list of all available webhook event types',
      tags: ['Webhooks']
    }
  })

// Helper function to get event descriptions
function getEventDescription(eventType: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    [WebhookEventType.INVOICE_CREATED]: 'Triggered when a new invoice is created',
    [WebhookEventType.INVOICE_UPDATED]: 'Triggered when an invoice is updated',
    [WebhookEventType.INVOICE_SENT]: 'Triggered when an invoice is sent to a customer',
    [WebhookEventType.INVOICE_PAID]: 'Triggered when an invoice is fully paid',
    [WebhookEventType.INVOICE_OVERDUE]: 'Triggered when an invoice becomes overdue',
    [WebhookEventType.INVOICE_VOIDED]: 'Triggered when an invoice is voided',
    [WebhookEventType.PAYMENT_RECEIVED]: 'Triggered when a payment is recorded for an invoice',
    
    [WebhookEventType.CUSTOMER_CREATED]: 'Triggered when a new customer is created',
    [WebhookEventType.CUSTOMER_UPDATED]: 'Triggered when customer details are updated',
    [WebhookEventType.CUSTOMER_DELETED]: 'Triggered when a customer is deleted',
    
    [WebhookEventType.INVENTORY_ITEM_CREATED]: 'Triggered when a new inventory item is created',
    [WebhookEventType.INVENTORY_ITEM_UPDATED]: 'Triggered when inventory item details are updated',
    [WebhookEventType.INVENTORY_ITEM_DELETED]: 'Triggered when an inventory item is deleted',
    [WebhookEventType.STOCK_LEVEL_LOW]: 'Triggered when stock level falls below minimum threshold',
    [WebhookEventType.STOCK_MOVEMENT]: 'Triggered when stock is moved between locations',
    
    [WebhookEventType.USER_CREATED]: 'Triggered when a new user is created',
    [WebhookEventType.USER_UPDATED]: 'Triggered when user details are updated',
    [WebhookEventType.USER_INVITED]: 'Triggered when a user is invited to join a tenant',
    [WebhookEventType.USER_DELETED]: 'Triggered when a user is deleted',
    
    [WebhookEventType.TENANT_CREATED]: 'Triggered when a new tenant is created',
    [WebhookEventType.TENANT_UPDATED]: 'Triggered when tenant details are updated',
    [WebhookEventType.TENANT_SUBSCRIPTION_CHANGED]: 'Triggered when tenant subscription changes',
    
    [WebhookEventType.GST_RETURN_GENERATED]: 'Triggered when a GST return is generated',
    [WebhookEventType.GST_RETURN_FILED]: 'Triggered when a GST return is filed',
    
    [WebhookEventType.BACKUP_COMPLETED]: 'Triggered when a system backup completes successfully',
    [WebhookEventType.BACKUP_FAILED]: 'Triggered when a system backup fails',
    [WebhookEventType.MAINTENANCE_STARTED]: 'Triggered when system maintenance begins',
    [WebhookEventType.MAINTENANCE_COMPLETED]: 'Triggered when system maintenance completes'
  }
  
  return descriptions[eventType] || 'No description available'
}