// Core types and interfaces
export * from './types'

// Signature verification
export { WebhookSignatureVerifier, webhookSignature } from './signature'

// Event publishing
export { 
  WebhookEventPublisher,
  InMemoryEventStorage,
  InMemoryEventQueue
} from './publisher'
export type { 
  EventStorageAdapter,
  EventQueueAdapter
} from './publisher'

// Event processing
export { 
  WebhookEventProcessor,
  SimpleHttpClient
} from './processor'
export type { 
  WebhookEndpointRepository,
  WebhookDeliveryRepository,
  HttpClient
} from './processor'

// Webhook management
export { 
  DefaultWebhookManager,
  createInMemoryWebhookManager
} from './manager'
export type { WebhookManager } from './manager'

// Convenience exports
import { WebhookEventType, WebhookDeliveryStatus } from './types'
import { DefaultWebhookManager } from './manager'

export const createWebhookManager = DefaultWebhookManager
export { WebhookEventType, WebhookDeliveryStatus }

// Default configuration
export { DEFAULT_WEBHOOK_CONFIG } from './types'