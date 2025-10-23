import { 
  WebhookManager,
  WebhookEventType,
  WebhookEndpoint,
  WebhookDelivery,
  WebhookStats,
  WebhookEndpointRepository,
  WebhookDeliveryRepository,
  HttpClient,
  createInMemoryWebhookManager,
  SimpleHttpClient,
  WebhookDeliveryStatus
} from '@accounts/webhooks'
import { prisma as db } from '@accounts/database'

// Prisma-based webhook endpoint repository
class PrismaWebhookEndpointRepository implements WebhookEndpointRepository {
  async findByTenantId(tenantId: string): Promise<WebhookEndpoint[]> {
    const endpoints = await db.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    })
    
    return endpoints.map(this.mapToWebhookEndpoint)
  }

  async findById(id: string): Promise<WebhookEndpoint | null> {
    const endpoint = await db.webhook.findUnique({
      where: { id }
    })
    
    return endpoint ? this.mapToWebhookEndpoint(endpoint) : null
  }

  async findByEventType(eventType: string, tenantId?: string): Promise<WebhookEndpoint[]> {
    const endpoints = await db.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: {
          has: eventType
        }
      }
    })
    
    return endpoints.map(this.mapToWebhookEndpoint)
  }

  async create(
    endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WebhookEndpoint> {
    const created = await db.webhook.create({
      data: {
        tenantId: endpoint.tenantId,
        url: endpoint.url,
        secret: endpoint.secret,
        events: endpoint.events as string[],
        isActive: endpoint.isActive ?? true
      }
    })
    
    return this.mapToWebhookEndpoint(created)
  }

  async update(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const updated = await db.webhook.update({
      where: { id },
      data: {
        url: updates.url,
        events: updates.events as string[],
        isActive: updates.isActive,
        secret: updates.secret
      }
    })
    
    return this.mapToWebhookEndpoint(updated)
  }

  async delete(id: string): Promise<void> {
    await db.webhook.delete({
      where: { id }
    })
  }

  private mapToWebhookEndpoint(data: any): WebhookEndpoint {
    return {
      id: data.id,
      tenantId: data.tenantId,
      url: data.url,
      secret: data.secret || '',
      events: data.events as WebhookEventType[],
      isActive: data.isActive,
      description: '', // Not in schema yet
      headers: undefined, // Not in schema yet
      timeout: 30000, // Default timeout
      retryAttempts: 5, // Default retry attempts
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }
  }

  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// Prisma-based webhook delivery repository
class PrismaWebhookDeliveryRepository implements WebhookDeliveryRepository {
  async create(
    delivery: Omit<WebhookDelivery, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WebhookDelivery> {
    const created = await db.webhookDelivery.create({
      data: {
        webhookId: delivery.webhookEndpointId,
        eventType: delivery.eventId, // Using eventId as eventType for now
        payload: { eventId: delivery.eventId },
        status: delivery.status,
        attempts: delivery.attempts,
        responseCode: delivery.responseStatus,
        responseBody: delivery.responseBody
      }
    })
    
    return this.mapToWebhookDelivery(created)
  }

  async update(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery> {
    const updated = await db.webhookDelivery.update({
      where: { id },
      data: {
        status: updates.status,
        attempts: updates.attempts,
        responseCode: updates.responseStatus,
        responseBody: updates.responseBody,
        nextAttempt: updates.nextRetryAt
      }
    })
    
    return this.mapToWebhookDelivery(updated)
  }

  async findById(id: string): Promise<WebhookDelivery | null> {
    const delivery = await db.webhookDelivery.findUnique({
      where: { id }
    })
    
    return delivery ? this.mapToWebhookDelivery(delivery) : null
  }

  async findFailedDeliveries(limit = 100): Promise<WebhookDelivery[]> {
    const deliveries = await db.webhookDelivery.findMany({
      where: {
        status: 'FAILED',
        nextAttempt: {
          lte: new Date()
        }
      },
      orderBy: { nextAttempt: 'asc' },
      take: limit
    })
    
    return deliveries.map(this.mapToWebhookDelivery)
  }

  async findByEndpointId(endpointId: string): Promise<WebhookDelivery[]> {
    const deliveries = await db.webhookDelivery.findMany({
      where: { webhookId: endpointId },
      orderBy: { createdAt: 'desc' }
    })
    
    return deliveries.map(this.mapToWebhookDelivery)
  }

  async getStats(endpointId: string): Promise<WebhookStats> {
    const deliveries = await db.webhookDelivery.findMany({
      where: { webhookId: endpointId },
      select: {
        status: true,
        createdAt: true
      }
    })

    const totalEvents = deliveries.length
    const deliveredEvents = deliveries.filter(d => d.status === 'SUCCESS').length
    const failedEvents = deliveries.filter(d => d.status === 'FAILED').length
    const pendingEvents = deliveries.filter(d => d.status === 'PENDING').length

    const successRate = totalEvents > 0 ? (deliveredEvents / totalEvents) * 100 : 0

    return {
      totalEvents,
      deliveredEvents,
      failedEvents,
      pendingEvents,
      averageDeliveryTime: 0,
      successRate,
      lastDeliveryAt: undefined,
      mostRecentError: undefined
    }
  }

  private mapToWebhookDelivery(data: any): WebhookDelivery {
    return {
      id: data.id,
      webhookEndpointId: data.webhookId,
      eventId: data.eventType,
      status: data.status as WebhookDeliveryStatus,
      attempts: data.attempts || 0,
      lastAttemptAt: undefined,
      nextRetryAt: data.nextAttempt,
      responseStatus: data.responseCode,
      responseBody: data.responseBody,
      responseHeaders: undefined,
      errorMessage: undefined,
      createdAt: data.createdAt,
      updatedAt: data.createdAt // Schema doesn't have updatedAt
    }
  }

  private generateId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// Initialize webhook manager
const endpointRepo = new PrismaWebhookEndpointRepository()
const deliveryRepo = new PrismaWebhookDeliveryRepository()
const httpClient = new SimpleHttpClient()

export const webhookManager = createInMemoryWebhookManager(
  endpointRepo,
  deliveryRepo,
  httpClient,
  {
    maxRetryAttempts: 5,
    initialRetryDelay: 2000,
    timeout: 15000,
    concurrency: 5
  }
)

// Convenience functions for common webhook operations
export const publishWebhookEvent = async <T>(
  eventType: WebhookEventType,
  data: T,
  tenantId: string,
  userId?: string
) => {
  await webhookManager.publishEvent(eventType, data, {
    tenantId,
    userId,
    timestamp: new Date().toISOString()
  })
}

export const createWebhookEndpoint = async (
  tenantId: string,
  url: string,
  events: WebhookEventType[],
  options: {
    secret?: string
    description?: string
    headers?: Record<string, string>
    timeout?: number
  } = {}
) => {
  const secret = options.secret || generateWebhookSecret()
  
  return await webhookManager.createEndpoint({
    tenantId,
    url,
    secret,
    events,
    isActive: true,
    description: options.description,
    headers: options.headers,
    timeout: options.timeout || 30000,
    retryAttempts: 5
  })
}

export const getWebhookEndpoints = async (tenantId: string) => {
  return await webhookManager.getEndpoints(tenantId)
}

export const getWebhookStats = async (endpointId: string) => {
  return await webhookManager.getEndpointStats(endpointId)
}

// Utility functions
function generateWebhookSecret(): string {
  return `whsec_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`
}

// Webhook manager should be started explicitly from index.ts after server is ready
// Not auto-started at module level to avoid port conflicts
export const startWebhookManager = async () => {
  console.log('Starting webhook manager...')
  await webhookManager.start()
  console.log('Webhook manager started successfully')
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down webhook manager...')
  await webhookManager.stop()
})

process.on('SIGINT', async () => {
  console.log('Shutting down webhook manager...')
  await webhookManager.stop()
})