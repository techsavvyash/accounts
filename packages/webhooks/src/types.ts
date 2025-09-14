import { z } from 'zod'

// Webhook Event Types
export enum WebhookEventType {
  // Invoice Events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_OVERDUE = 'invoice.overdue',
  INVOICE_VOIDED = 'invoice.voided',
  PAYMENT_RECEIVED = 'invoice.payment_received',
  
  // Customer Events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Inventory Events
  INVENTORY_ITEM_CREATED = 'inventory.item_created',
  INVENTORY_ITEM_UPDATED = 'inventory.item_updated',
  INVENTORY_ITEM_DELETED = 'inventory.item_deleted',
  STOCK_LEVEL_LOW = 'inventory.stock_level_low',
  STOCK_MOVEMENT = 'inventory.stock_movement',
  
  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_INVITED = 'user.invited',
  USER_DELETED = 'user.deleted',
  
  // Tenant Events
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_SUBSCRIPTION_CHANGED = 'tenant.subscription_changed',
  
  // GST Events
  GST_RETURN_GENERATED = 'gst.return_generated',
  GST_RETURN_FILED = 'gst.return_filed',
  
  // System Events
  BACKUP_COMPLETED = 'system.backup_completed',
  BACKUP_FAILED = 'system.backup_failed',
  MAINTENANCE_STARTED = 'system.maintenance_started',
  MAINTENANCE_COMPLETED = 'system.maintenance_completed'
}

// Webhook delivery status
export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRY = 'retry'
}

// Base webhook event structure
export interface WebhookEvent<T = any> {
  id: string
  type: WebhookEventType
  data: T
  metadata: {
    tenantId: string
    userId?: string
    timestamp: string
    version: string
    environment: string
    source: string
  }
}

// Webhook endpoint configuration
export interface WebhookEndpoint {
  id: string
  tenantId: string
  url: string
  secret: string
  events: WebhookEventType[]
  isActive: boolean
  description?: string
  headers?: Record<string, string>
  timeout: number
  retryAttempts: number
  createdAt: Date
  updatedAt: Date
}

// Webhook delivery record
export interface WebhookDelivery {
  id: string
  webhookEndpointId: string
  eventId: string
  status: WebhookDeliveryStatus
  attempts: number
  lastAttemptAt?: Date
  nextRetryAt?: Date
  responseStatus?: number
  responseBody?: string
  responseHeaders?: Record<string, string>
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

// Event schemas for validation
export const InvoiceEventSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string(),
  customerId: z.string().uuid(),
  customerName: z.string(),
  amount: z.number(),
  taxAmount: z.number().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number()
  })).optional()
})

export const CustomerEventSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string()
  }).optional(),
  gstin: z.string().optional(),
  creditLimit: z.number().optional()
})

export const InventoryEventSchema = z.object({
  itemId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  currentStock: z.number().optional(),
  minStockLevel: z.number().optional(),
  unitPrice: z.number().optional(),
  warehouseId: z.string().uuid().optional()
})

export const UserEventSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.string(),
  tenantId: z.string().uuid(),
  isActive: z.boolean().optional()
})

export const TenantEventSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string(),
  businessName: z.string().optional(),
  gstin: z.string().optional(),
  plan: z.string().optional(),
  isActive: z.boolean().optional()
})

// Webhook configuration options
export interface WebhookConfig {
  maxRetryAttempts: number
  initialRetryDelay: number // milliseconds
  maxRetryDelay: number // milliseconds
  backoffMultiplier: number
  timeout: number // milliseconds
  batchSize: number
  concurrency: number
  enableSignatureVerification: boolean
  signatureHeader: string
  timestampHeader: string
  timestampTolerance: number // seconds
}

// Event filter interface
export interface EventFilter {
  tenantId?: string
  eventTypes?: WebhookEventType[]
  fromDate?: Date
  toDate?: Date
  userId?: string
  customerId?: string
  invoiceId?: string
}

// Webhook statistics
export interface WebhookStats {
  totalEvents: number
  deliveredEvents: number
  failedEvents: number
  pendingEvents: number
  averageDeliveryTime: number
  successRate: number
  lastDeliveryAt?: Date
  mostRecentError?: string
}

// Event store interface
export interface EventStore {
  id: string
  type: WebhookEventType
  data: any
  metadata: Record<string, any>
  createdAt: Date
  processedAt?: Date
  tenantId: string
  userId?: string
}

// Webhook processor interface
export interface WebhookProcessor {
  processEvent(event: WebhookEvent): Promise<void>
  retryFailedDeliveries(): Promise<void>
  getStats(endpointId: string): Promise<WebhookStats>
}

// Event publisher interface
export interface EventPublisher {
  publish<T>(eventType: WebhookEventType, data: T, metadata?: Partial<WebhookEvent['metadata']>): Promise<void>
  publishBatch(events: Omit<WebhookEvent, 'id'>[]): Promise<void>
}

// Event subscriber interface
export interface EventSubscriber {
  subscribe(eventTypes: WebhookEventType[], handler: (event: WebhookEvent) => Promise<void>): void
  unsubscribe(eventTypes: WebhookEventType[]): void
}

// Webhook signature verification
export interface SignatureVerification {
  generateSignature(payload: string, secret: string, timestamp?: number): string
  verifySignature(payload: string, signature: string, secret: string, timestamp?: number): boolean
  isTimestampValid(timestamp: number, tolerance: number): boolean
}

// Error types
export class WebhookError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'WebhookError'
  }
}

export class WebhookDeliveryError extends WebhookError {
  constructor(
    message: string,
    public endpointId: string,
    public eventId: string,
    public statusCode?: number,
    details?: any
  ) {
    super(message, 'WEBHOOK_DELIVERY_ERROR', details)
  }
}

export class WebhookSignatureError extends WebhookError {
  constructor(message: string, details?: any) {
    super(message, 'WEBHOOK_SIGNATURE_ERROR', details)
  }
}

export class WebhookConfigError extends WebhookError {
  constructor(message: string, details?: any) {
    super(message, 'WEBHOOK_CONFIG_ERROR', details)
  }
}

// Type utilities
export type WebhookEventData<T extends WebhookEventType> = 
  T extends WebhookEventType.INVOICE_CREATED | WebhookEventType.INVOICE_UPDATED ? z.infer<typeof InvoiceEventSchema> :
  T extends WebhookEventType.CUSTOMER_CREATED | WebhookEventType.CUSTOMER_UPDATED ? z.infer<typeof CustomerEventSchema> :
  T extends WebhookEventType.INVENTORY_ITEM_CREATED | WebhookEventType.INVENTORY_ITEM_UPDATED ? z.infer<typeof InventoryEventSchema> :
  T extends WebhookEventType.USER_CREATED | WebhookEventType.USER_UPDATED ? z.infer<typeof UserEventSchema> :
  T extends WebhookEventType.TENANT_CREATED | WebhookEventType.TENANT_UPDATED ? z.infer<typeof TenantEventSchema> :
  any

// Default webhook configuration
export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  maxRetryAttempts: 5,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
  timeout: 30000, // 30 seconds
  batchSize: 100,
  concurrency: 10,
  enableSignatureVerification: true,
  signatureHeader: 'X-Webhook-Signature',
  timestampHeader: 'X-Webhook-Timestamp',
  timestampTolerance: 300 // 5 minutes
}