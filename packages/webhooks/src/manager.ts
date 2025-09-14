import {
  WebhookEventType,
  WebhookEndpoint,
  WebhookConfig,
  WebhookEvent,
  WebhookStats,
  DEFAULT_WEBHOOK_CONFIG,
  EventFilter
} from './types'
import { WebhookEventPublisher, EventStorageAdapter, EventQueueAdapter } from './publisher'
import { WebhookEventProcessor, WebhookEndpointRepository, WebhookDeliveryRepository, HttpClient } from './processor'

export interface WebhookManager {
  // Endpoint management
  createEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebhookEndpoint>
  updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint>
  deleteEndpoint(id: string): Promise<void>
  getEndpoint(id: string): Promise<WebhookEndpoint | null>
  getEndpoints(tenantId: string): Promise<WebhookEndpoint[]>
  
  // Event publishing
  publishEvent<T>(eventType: WebhookEventType, data: T, metadata?: Partial<WebhookEvent['metadata']>): Promise<void>
  publishBatch(events: Omit<WebhookEvent, 'id'>[]): Promise<void>
  
  // Event processing
  processEvents(): Promise<void>
  retryFailedDeliveries(): Promise<void>
  
  // Statistics and monitoring
  getEndpointStats(endpointId: string): Promise<WebhookStats>
  getEvents(filter: EventFilter): Promise<WebhookEvent[]>
  
  // Lifecycle
  start(): Promise<void>
  stop(): Promise<void>
}

export class DefaultWebhookManager implements WebhookManager {
  private publisher: WebhookEventPublisher
  private processor: WebhookEventProcessor
  private isRunning = false
  private processingInterval?: NodeJS.Timeout
  private retryInterval?: NodeJS.Timeout

  constructor(
    private endpointRepo: WebhookEndpointRepository,
    private deliveryRepo: WebhookDeliveryRepository,
    private storageAdapter: EventStorageAdapter,
    private queueAdapter: EventQueueAdapter,
    private httpClient: HttpClient,
    private config: WebhookConfig = DEFAULT_WEBHOOK_CONFIG
  ) {
    this.publisher = new WebhookEventPublisher(
      storageAdapter,
      queueAdapter,
      config
    )
    
    this.processor = new WebhookEventProcessor(
      endpointRepo,
      deliveryRepo,
      httpClient,
      config
    )
  }

  // Endpoint management
  async createEndpoint(
    endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WebhookEndpoint> {
    return await this.endpointRepo.create(endpoint)
  }

  async updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    return await this.endpointRepo.update(id, updates)
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.endpointRepo.delete(id)
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint | null> {
    return await this.endpointRepo.findById(id)
  }

  async getEndpoints(tenantId: string): Promise<WebhookEndpoint[]> {
    return await this.endpointRepo.findByTenantId(tenantId)
  }

  // Event publishing
  async publishEvent<T>(
    eventType: WebhookEventType,
    data: T,
    metadata?: Partial<WebhookEvent['metadata']>
  ): Promise<void> {
    await this.publisher.publish(eventType, data, metadata)
  }

  async publishBatch(events: Omit<WebhookEvent, 'id'>[]): Promise<void> {
    await this.publisher.publishBatch(events)
  }

  // Event processing
  async processEvents(): Promise<void> {
    const batchSize = this.config.batchSize
    let processed = 0
    
    while (true) {
      const event = await this.queueAdapter.dequeue()
      if (!event) break
      
      try {
        await this.processor.processEvent(event)
        processed++
        
        if (processed >= batchSize) break
      } catch (error) {
        console.error(`Failed to process event ${event.id}:`, error)
        // Could implement dead letter queue here
      }
    }
    
    if (processed > 0) {
      console.log(`Processed ${processed} webhook events`)
    }
  }

  async retryFailedDeliveries(): Promise<void> {
    await this.processor.retryFailedDeliveries()
  }

  // Statistics and monitoring
  async getEndpointStats(endpointId: string): Promise<WebhookStats> {
    return await this.processor.getStats(endpointId)
  }

  async getEvents(filter: EventFilter): Promise<WebhookEvent[]> {
    // This would typically query the event storage with filters
    // For now, return empty array as this requires more complex querying
    return []
  }

  // Lifecycle management
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Webhook manager is already running')
      return
    }
    
    this.isRunning = true
    console.log('Starting webhook manager...')
    
    // Start event processing loop
    this.processingInterval = setInterval(async () => {
      if (!this.isRunning) return
      
      try {
        await this.processEvents()
      } catch (error) {
        console.error('Error in webhook event processing:', error)
      }
    }, 5000) // Process every 5 seconds
    
    // Start retry loop
    this.retryInterval = setInterval(async () => {
      if (!this.isRunning) return
      
      try {
        await this.retryFailedDeliveries()
      } catch (error) {
        console.error('Error in webhook retry processing:', error)
      }
    }, 30000) // Retry failed deliveries every 30 seconds
    
    console.log('Webhook manager started successfully')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Webhook manager is not running')
      return
    }
    
    console.log('Stopping webhook manager...')
    this.isRunning = false
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    
    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = undefined
    }
    
    // Process remaining events before stopping
    try {
      await this.processEvents()
      console.log('Processed remaining events before shutdown')
    } catch (error) {
      console.error('Error processing remaining events:', error)
    }
    
    console.log('Webhook manager stopped successfully')
  }

  // Utility methods
  async getQueueSize(): Promise<number> {
    return await this.queueAdapter.size()
  }

  async validateEndpoint(url: string, secret: string): Promise<boolean> {
    try {
      const testEvent: WebhookEvent = {
        id: 'test_' + Date.now(),
        type: WebhookEventType.CUSTOMER_CREATED,
        data: { test: true },
        metadata: {
          tenantId: 'test',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'webhook-validation'
        }
      }
      
      const response = await this.httpClient.post(url, testEvent, {
        headers: {
          'X-Webhook-Test': 'true'
        },
        timeout: 10000
      })
      
      return response.status >= 200 && response.status < 300
    } catch (error) {
      console.error('Endpoint validation failed:', error)
      return false
    }
  }
}

// Helper function to create a webhook manager with in-memory adapters (for development)
export function createInMemoryWebhookManager(
  endpointRepo: WebhookEndpointRepository,
  deliveryRepo: WebhookDeliveryRepository,
  httpClient: HttpClient,
  config?: Partial<WebhookConfig>
): DefaultWebhookManager {
  const { 
    InMemoryEventStorage, 
    InMemoryEventQueue 
  } = require('./publisher')
  
  const storageAdapter = new InMemoryEventStorage()
  const queueAdapter = new InMemoryEventQueue()
  
  const finalConfig = { ...DEFAULT_WEBHOOK_CONFIG, ...config }
  
  return new DefaultWebhookManager(
    endpointRepo,
    deliveryRepo,
    storageAdapter,
    queueAdapter,
    httpClient,
    finalConfig
  )
}