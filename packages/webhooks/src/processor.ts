import { 
  WebhookProcessor, 
  WebhookEvent, 
  WebhookEndpoint, 
  WebhookDelivery, 
  WebhookDeliveryStatus,
  WebhookConfig,
  WebhookStats,
  WebhookDeliveryError,
  DEFAULT_WEBHOOK_CONFIG
} from './types'
import { webhookSignature } from './signature'

export interface WebhookEndpointRepository {
  findByTenantId(tenantId: string): Promise<WebhookEndpoint[]>
  findById(id: string): Promise<WebhookEndpoint | null>
  findByEventType(eventType: string, tenantId?: string): Promise<WebhookEndpoint[]>
  create(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEndpoint>
  update(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint>
  delete(id: string): Promise<void>
}

export interface WebhookDeliveryRepository {
  create(delivery: Omit<WebhookDelivery, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookDelivery>
  update(id: string, updates: Partial<WebhookDelivery>): Promise<WebhookDelivery>
  findById(id: string): Promise<WebhookDelivery | null>
  findFailedDeliveries(limit?: number): Promise<WebhookDelivery[]>
  findByEndpointId(endpointId: string): Promise<WebhookDelivery[]>
  getStats(endpointId: string): Promise<WebhookStats>
}

export interface HttpClient {
  post(url: string, data: any, options?: {
    headers?: Record<string, string>
    timeout?: number
  }): Promise<{
    status: number
    statusText: string
    headers: Record<string, string>
    data: any
  }>
}

export class WebhookEventProcessor implements WebhookProcessor {
  constructor(
    private endpointRepo: WebhookEndpointRepository,
    private deliveryRepo: WebhookDeliveryRepository,
    private httpClient: HttpClient,
    private config: WebhookConfig = DEFAULT_WEBHOOK_CONFIG
  ) {}

  async processEvent(event: WebhookEvent): Promise<void> {
    // Find all endpoints that should receive this event
    const endpoints = await this.endpointRepo.findByEventType(
      event.type,
      event.metadata.tenantId
    )

    // Filter active endpoints that are subscribed to this event type
    const activeEndpoints = endpoints.filter(endpoint => 
      endpoint.isActive && endpoint.events.includes(event.type)
    )

    // Deliver to each endpoint concurrently (with concurrency limit)
    const deliveries = activeEndpoints.map(endpoint => 
      this.deliverToEndpoint(event, endpoint)
    )

    // Process deliveries in batches to respect concurrency limits
    const batchSize = this.config.concurrency
    for (let i = 0; i < deliveries.length; i += batchSize) {
      const batch = deliveries.slice(i, i + batchSize)
      await Promise.allSettled(batch)
    }
  }

  private async deliverToEndpoint(
    event: WebhookEvent, 
    endpoint: WebhookEndpoint
  ): Promise<WebhookDelivery> {
    const deliveryId = this.generateDeliveryId()
    
    // Create delivery record
    const delivery = await this.deliveryRepo.create({
      id: deliveryId,
      webhookEndpointId: endpoint.id,
      eventId: event.id,
      status: WebhookDeliveryStatus.PENDING,
      attempts: 0
    })

    try {
      const result = await this.attemptDelivery(event, endpoint)
      
      // Update delivery with success
      return await this.deliveryRepo.update(delivery.id, {
        status: WebhookDeliveryStatus.DELIVERED,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        responseStatus: result.status,
        responseBody: JSON.stringify(result.data),
        responseHeaders: result.headers
      })
    } catch (error) {
      // Update delivery with failure
      const updatedDelivery = await this.deliveryRepo.update(delivery.id, {
        status: WebhookDeliveryStatus.FAILED,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        nextRetryAt: this.calculateNextRetryTime(delivery.attempts + 1)
      })

      console.error(`Webhook delivery failed for endpoint ${endpoint.id}:`, error)
      
      // Schedule retry if we haven't exceeded max attempts
      if (delivery.attempts + 1 < this.config.maxRetryAttempts) {
        await this.deliveryRepo.update(updatedDelivery.id, {
          status: WebhookDeliveryStatus.RETRY
        })
      }

      return updatedDelivery
    }
  }

  private async attemptDelivery(event: WebhookEvent, endpoint: WebhookEndpoint) {
    const payload = JSON.stringify(event)
    const timestamp = Math.floor(Date.now() / 1000)
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Accounts-Webhook/1.0',
      ...(endpoint.headers || {})
    }

    // Add signature if verification is enabled
    if (this.config.enableSignatureVerification) {
      const signature = webhookSignature.generateSignature(payload, endpoint.secret, timestamp)
      headers[this.config.signatureHeader] = signature
      headers[this.config.timestampHeader] = timestamp.toString()
    }

    return await this.httpClient.post(endpoint.url, event, {
      headers,
      timeout: endpoint.timeout || this.config.timeout
    })
  }

  async retryFailedDeliveries(): Promise<void> {
    const failedDeliveries = await this.deliveryRepo.findFailedDeliveries(
      this.config.batchSize
    )

    const retriesReady = failedDeliveries.filter(delivery => 
      delivery.nextRetryAt && delivery.nextRetryAt <= new Date()
    )

    // Process retries in batches
    const batchSize = this.config.concurrency
    for (let i = 0; i < retriesReady.length; i += batchSize) {
      const batch = retriesReady.slice(i, i + batchSize)
      const retryPromises = batch.map(delivery => this.retryDelivery(delivery))
      await Promise.allSettled(retryPromises)
    }
  }

  private async retryDelivery(delivery: WebhookDelivery): Promise<void> {
    try {
      // Get the endpoint and event details
      const endpoint = await this.endpointRepo.findById(delivery.webhookEndpointId)
      if (!endpoint || !endpoint.isActive) {
        console.log(`Skipping retry for inactive endpoint ${delivery.webhookEndpointId}`)
        return
      }

      // For retry, we need to reconstruct the event (this would typically come from event store)
      // This is a simplified version - in production you'd fetch the event from storage
      const event: WebhookEvent = {
        id: delivery.eventId,
        type: 'retry' as any, // This should be fetched from event store
        data: {},
        metadata: {
          tenantId: 'unknown',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          source: 'webhook-retry'
        }
      }

      const result = await this.attemptDelivery(event, endpoint)
      
      // Update delivery with success
      await this.deliveryRepo.update(delivery.id, {
        status: WebhookDeliveryStatus.DELIVERED,
        attempts: delivery.attempts + 1,
        lastAttemptAt: new Date(),
        responseStatus: result.status,
        responseBody: JSON.stringify(result.data),
        responseHeaders: result.headers,
        nextRetryAt: undefined
      })

      console.log(`Webhook delivery retry succeeded for delivery ${delivery.id}`)
    } catch (error) {
      const newAttempts = delivery.attempts + 1
      const shouldRetry = newAttempts < this.config.maxRetryAttempts
      
      await this.deliveryRepo.update(delivery.id, {
        status: shouldRetry ? WebhookDeliveryStatus.RETRY : WebhookDeliveryStatus.FAILED,
        attempts: newAttempts,
        lastAttemptAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        nextRetryAt: shouldRetry ? this.calculateNextRetryTime(newAttempts) : undefined
      })

      console.error(`Webhook delivery retry failed for delivery ${delivery.id}:`, error)
    }
  }

  async getStats(endpointId: string): Promise<WebhookStats> {
    return await this.deliveryRepo.getStats(endpointId)
  }

  private calculateNextRetryTime(attempt: number): Date {
    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
      this.config.maxRetryDelay
    )
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay
    const totalDelay = delay + jitter
    
    return new Date(Date.now() + totalDelay)
  }

  private generateDeliveryId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `del_${timestamp}_${random}`
  }
}

// Simple HTTP client implementation
export class SimpleHttpClient implements HttpClient {
  async post(url: string, data: any, options: {
    headers?: Record<string, string>
    timeout?: number
  } = {}): Promise<{
    status: number
    statusText: string
    headers: Record<string, string>
    data: any
  }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000)
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const responseData = await response.text()
      let parsedData: any = responseData
      
      try {
        parsedData = JSON.parse(responseData)
      } catch {
        // Keep as text if not valid JSON
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        throw new WebhookDeliveryError(
          `HTTP request failed: ${error.message}`,
          'unknown',
          'unknown'
        )
      }
      
      throw error
    }
  }
}