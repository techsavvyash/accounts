import { 
  EventPublisher, 
  WebhookEvent, 
  WebhookEventType,
  WebhookConfig,
  DEFAULT_WEBHOOK_CONFIG
} from './types'

export interface EventStorageAdapter {
  store(event: WebhookEvent): Promise<void>
  storeBatch(events: WebhookEvent[]): Promise<void>
  getEvent(eventId: string): Promise<WebhookEvent | null>
  getEventsByType(eventType: WebhookEventType, tenantId?: string): Promise<WebhookEvent[]>
}

export interface EventQueueAdapter {
  enqueue(event: WebhookEvent): Promise<void>
  enqueueBatch(events: WebhookEvent[]): Promise<void>
  dequeue(): Promise<WebhookEvent | null>
  peek(): Promise<WebhookEvent | null>
  size(): Promise<number>
}

export class WebhookEventPublisher implements EventPublisher {
  constructor(
    private storageAdapter: EventStorageAdapter,
    private queueAdapter: EventQueueAdapter,
    private config: WebhookConfig = DEFAULT_WEBHOOK_CONFIG
  ) {}

  async publish<T>(
    eventType: WebhookEventType,
    data: T,
    metadata: Partial<WebhookEvent['metadata']> = {}
  ): Promise<void> {
    const event = this.createEvent(eventType, data, metadata)
    
    try {
      // Store event for auditing and replay
      await this.storageAdapter.store(event)
      
      // Queue event for processing
      await this.queueAdapter.enqueue(event)
    } catch (error) {
      console.error(`Failed to publish event ${event.id}:`, error)
      throw error
    }
  }

  async publishBatch(events: Omit<WebhookEvent, 'id'>[]): Promise<void> {
    const webhookEvents = events.map(event => ({
      ...event,
      id: this.generateEventId()
    }))
    
    try {
      // Store events in batch
      await this.storageAdapter.storeBatch(webhookEvents)
      
      // Queue events for processing
      await this.queueAdapter.enqueueBatch(webhookEvents)
    } catch (error) {
      console.error('Failed to publish batch events:', error)
      throw error
    }
  }

  private createEvent<T>(
    eventType: WebhookEventType,
    data: T,
    metadata: Partial<WebhookEvent['metadata']> = {}
  ): WebhookEvent<T> {
    return {
      id: this.generateEventId(),
      type: eventType,
      data,
      metadata: {
        tenantId: metadata.tenantId || 'system',
        userId: metadata.userId,
        timestamp: metadata.timestamp || new Date().toISOString(),
        version: metadata.version || '1.0.0',
        environment: metadata.environment || process.env.NODE_ENV || 'development',
        source: metadata.source || 'accounts-api'
      }
    }
  }

  private generateEventId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `evt_${timestamp}_${random}`
  }
}

// In-memory implementations for development
export class InMemoryEventStorage implements EventStorageAdapter {
  private events = new Map<string, WebhookEvent>()

  async store(event: WebhookEvent): Promise<void> {
    this.events.set(event.id, event)
  }

  async storeBatch(events: WebhookEvent[]): Promise<void> {
    for (const event of events) {
      this.events.set(event.id, event)
    }
  }

  async getEvent(eventId: string): Promise<WebhookEvent | null> {
    return this.events.get(eventId) || null
  }

  async getEventsByType(eventType: WebhookEventType, tenantId?: string): Promise<WebhookEvent[]> {
    const filteredEvents = Array.from(this.events.values()).filter(event => {
      const typeMatches = event.type === eventType
      const tenantMatches = !tenantId || event.metadata.tenantId === tenantId
      return typeMatches && tenantMatches
    })
    
    return filteredEvents.sort((a, b) => 
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    )
  }

  clear(): void {
    this.events.clear()
  }
}

export class InMemoryEventQueue implements EventQueueAdapter {
  private queue: WebhookEvent[] = []

  async enqueue(event: WebhookEvent): Promise<void> {
    this.queue.push(event)
  }

  async enqueueBatch(events: WebhookEvent[]): Promise<void> {
    this.queue.push(...events)
  }

  async dequeue(): Promise<WebhookEvent | null> {
    return this.queue.shift() || null
  }

  async peek(): Promise<WebhookEvent | null> {
    return this.queue[0] || null
  }

  async size(): Promise<number> {
    return this.queue.length
  }

  clear(): void {
    this.queue.length = 0
  }
}