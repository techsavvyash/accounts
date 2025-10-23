import { describe, it, expect, beforeEach } from 'bun:test'
import {
  WebhookEventPublisher,
  InMemoryEventStorage,
  InMemoryEventQueue
} from './publisher'
import { WebhookEventType } from './types'

describe('WebhookEventPublisher', () => {
  let storage: InMemoryEventStorage
  let queue: InMemoryEventQueue
  let publisher: WebhookEventPublisher

  beforeEach(() => {
    storage = new InMemoryEventStorage()
    queue = new InMemoryEventQueue()
    publisher = new WebhookEventPublisher(storage, queue)
  })

  describe('publish', () => {
    it('should publish event successfully', async () => {
      const eventData = {
        invoiceId: 'inv-123',
        amount: 1000,
        status: 'SENT'
      }

      await publisher.publish(
        WebhookEventType.INVOICE_CREATED,
        eventData,
        {
          tenantId: 'tenant-1',
          userId: 'user-1'
        }
      )

      // Check event was stored
      const events = await storage.getEventsByType(WebhookEventType.INVOICE_CREATED)
      expect(events).toHaveLength(1)
      expect(events[0].data).toEqual(eventData)
      expect(events[0].metadata.tenantId).toBe('tenant-1')
      expect(events[0].metadata.userId).toBe('user-1')

      // Check event was queued
      const queueSize = await queue.size()
      expect(queueSize).toBe(1)

      const queuedEvent = await queue.peek()
      expect(queuedEvent?.type).toBe(WebhookEventType.INVOICE_CREATED)
    })

    it('should generate unique event IDs', async () => {
      await publisher.publish(WebhookEventType.INVOICE_CREATED, { id: 1 })
      await publisher.publish(WebhookEventType.INVOICE_CREATED, { id: 2 })
      await publisher.publish(WebhookEventType.INVOICE_CREATED, { id: 3 })

      const events = await storage.getEventsByType(WebhookEventType.INVOICE_CREATED)
      const eventIds = events.map(e => e.id)

      expect(eventIds).toHaveLength(3)
      expect(new Set(eventIds).size).toBe(3) // All IDs should be unique
    })

    it('should include default metadata values', async () => {
      await publisher.publish(
        WebhookEventType.PAYMENT_RECEIVED,
        { amount: 500 }
      )

      const events = await storage.getEventsByType(WebhookEventType.PAYMENT_RECEIVED)
      const event = events[0]

      expect(event.metadata.tenantId).toBe('system') // Default tenant
      expect(event.metadata.version).toBe('1.0.0')
      expect(event.metadata.source).toBe('accounts-api')
      expect(event.metadata.timestamp).toBeDefined()
    })

    it('should override default metadata with provided values', async () => {
      await publisher.publish(
        WebhookEventType.INVOICE_UPDATED,
        { invoiceId: 'inv-456' },
        {
          tenantId: 'custom-tenant',
          userId: 'custom-user',
          version: '2.0.0',
          source: 'mobile-app'
        }
      )

      const events = await storage.getEventsByType(WebhookEventType.INVOICE_UPDATED)
      const event = events[0]

      expect(event.metadata.tenantId).toBe('custom-tenant')
      expect(event.metadata.userId).toBe('custom-user')
      expect(event.metadata.version).toBe('2.0.0')
      expect(event.metadata.source).toBe('mobile-app')
    })
  })

  describe('publishBatch', () => {
    it('should publish multiple events in batch', async () => {
      const events = [
        {
          type: WebhookEventType.INVOICE_CREATED,
          data: { invoiceId: 'inv-1' },
          metadata: {
            tenantId: 'tenant-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          type: WebhookEventType.INVOICE_CREATED,
          data: { invoiceId: 'inv-2' },
          metadata: {
            tenantId: 'tenant-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          type: WebhookEventType.PAYMENT_RECEIVED,
          data: { paymentId: 'pay-1' },
          metadata: {
            tenantId: 'tenant-1',
            userId: 'user-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await publisher.publishBatch(events)

      // Check all events were stored
      const invoiceEvents = await storage.getEventsByType(WebhookEventType.INVOICE_CREATED)
      const paymentEvents = await storage.getEventsByType(WebhookEventType.PAYMENT_RECEIVED)

      expect(invoiceEvents).toHaveLength(2)
      expect(paymentEvents).toHaveLength(1)

      // Check all events were queued
      const queueSize = await queue.size()
      expect(queueSize).toBe(3)
    })

    it('should handle empty batch', async () => {
      await publisher.publishBatch([])

      const queueSize = await queue.size()
      expect(queueSize).toBe(0)
    })
  })
})

describe('InMemoryEventStorage', () => {
  let storage: InMemoryEventStorage

  beforeEach(() => {
    storage = new InMemoryEventStorage()
  })

  describe('store', () => {
    it('should store event', async () => {
      const event = {
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: { invoiceId: 'inv-1' },
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      await storage.store(event)

      const retrieved = await storage.getEvent('evt-1')
      expect(retrieved).toEqual(event)
    })
  })

  describe('storeBatch', () => {
    it('should store multiple events', async () => {
      const events = [
        {
          id: 'evt-1',
          type: WebhookEventType.INVOICE_CREATED,
          data: { invoiceId: 'inv-1' },
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-2',
          type: WebhookEventType.INVOICE_CREATED,
          data: { invoiceId: 'inv-2' },
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await storage.storeBatch(events)

      const evt1 = await storage.getEvent('evt-1')
      const evt2 = await storage.getEvent('evt-2')

      expect(evt1).toEqual(events[0])
      expect(evt2).toEqual(events[1])
    })
  })

  describe('getEvent', () => {
    it('should return null for non-existent event', async () => {
      const event = await storage.getEvent('non-existent')
      expect(event).toBeNull()
    })
  })

  describe('getEventsByType', () => {
    it('should filter events by type', async () => {
      const events = [
        {
          id: 'evt-1',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-2',
          type: WebhookEventType.PAYMENT_RECEIVED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-3',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await storage.storeBatch(events)

      const invoiceEvents = await storage.getEventsByType(WebhookEventType.INVOICE_CREATED)
      const paymentEvents = await storage.getEventsByType(WebhookEventType.PAYMENT_RECEIVED)

      expect(invoiceEvents).toHaveLength(2)
      expect(paymentEvents).toHaveLength(1)
    })

    it('should filter events by tenant ID', async () => {
      const events = [
        {
          id: 'evt-1',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-2',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-2',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await storage.storeBatch(events)

      const tenant1Events = await storage.getEventsByType(
        WebhookEventType.INVOICE_CREATED,
        'tenant-1'
      )

      expect(tenant1Events).toHaveLength(1)
      expect(tenant1Events[0].metadata.tenantId).toBe('tenant-1')
    })

    it('should return events sorted by timestamp (newest first)', async () => {
      const now = new Date()
      const events = [
        {
          id: 'evt-1',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date(now.getTime() - 3000).toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-2',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date(now.getTime() - 1000).toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-3',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date(now.getTime() - 2000).toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await storage.storeBatch(events)

      const sortedEvents = await storage.getEventsByType(WebhookEventType.INVOICE_CREATED)

      expect(sortedEvents[0].id).toBe('evt-2') // Newest
      expect(sortedEvents[1].id).toBe('evt-3')
      expect(sortedEvents[2].id).toBe('evt-1') // Oldest
    })
  })

  describe('clear', () => {
    it('should clear all events', async () => {
      const event = {
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      await storage.store(event)
      storage.clear()

      const retrieved = await storage.getEvent('evt-1')
      expect(retrieved).toBeNull()
    })
  })
})

describe('InMemoryEventQueue', () => {
  let queue: InMemoryEventQueue

  beforeEach(() => {
    queue = new InMemoryEventQueue()
  })

  describe('enqueue', () => {
    it('should add event to queue', async () => {
      const event = {
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      await queue.enqueue(event)

      const size = await queue.size()
      expect(size).toBe(1)
    })
  })

  describe('enqueueBatch', () => {
    it('should add multiple events to queue', async () => {
      const events = [
        {
          id: 'evt-1',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        },
        {
          id: 'evt-2',
          type: WebhookEventType.INVOICE_CREATED,
          data: {},
          metadata: {
            tenantId: 'tenant-1',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: 'test',
            source: 'test'
          }
        }
      ]

      await queue.enqueueBatch(events)

      const size = await queue.size()
      expect(size).toBe(2)
    })
  })

  describe('dequeue', () => {
    it('should remove and return first event', async () => {
      const event1 = {
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: { order: 1 },
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      const event2 = {
        id: 'evt-2',
        type: WebhookEventType.INVOICE_CREATED,
        data: { order: 2 },
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      await queue.enqueue(event1)
      await queue.enqueue(event2)

      const dequeued = await queue.dequeue()
      expect(dequeued?.id).toBe('evt-1')

      const size = await queue.size()
      expect(size).toBe(1)
    })

    it('should return null for empty queue', async () => {
      const dequeued = await queue.dequeue()
      expect(dequeued).toBeNull()
    })
  })

  describe('peek', () => {
    it('should return first event without removing it', async () => {
      const event = {
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      }

      await queue.enqueue(event)

      const peeked = await queue.peek()
      expect(peeked?.id).toBe('evt-1')

      const size = await queue.size()
      expect(size).toBe(1) // Size should remain unchanged
    })

    it('should return null for empty queue', async () => {
      const peeked = await queue.peek()
      expect(peeked).toBeNull()
    })
  })

  describe('size', () => {
    it('should return correct queue size', async () => {
      expect(await queue.size()).toBe(0)

      await queue.enqueue({
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      })

      expect(await queue.size()).toBe(1)

      await queue.enqueue({
        id: 'evt-2',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      })

      expect(await queue.size()).toBe(2)

      await queue.dequeue()

      expect(await queue.size()).toBe(1)
    })
  })

  describe('clear', () => {
    it('should clear all events from queue', async () => {
      await queue.enqueue({
        id: 'evt-1',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      })

      await queue.enqueue({
        id: 'evt-2',
        type: WebhookEventType.INVOICE_CREATED,
        data: {},
        metadata: {
          tenantId: 'tenant-1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: 'test',
          source: 'test'
        }
      })

      queue.clear()

      const size = await queue.size()
      expect(size).toBe(0)
    })
  })
})
