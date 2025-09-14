import { z } from 'zod'

// Base event properties that are included with every event
export interface BaseEventProperties {
  timestamp: string
  userId?: string
  tenantId?: string
  roleName?: string
  tenant?: string
  sessionId?: string
  userAgent?: string
  ip?: string
  path?: string
  method?: string
  duration?: number
}

// User properties for identification
export interface UserProperties {
  email?: string
  name?: string
  role?: string
  tenantCount?: number
  isActive?: boolean
  lastLoginAt?: string
  createdAt?: string
  preferences?: Record<string, any>
}

// Tenant/Organization properties
export interface TenantProperties {
  name: string
  businessName?: string
  gstin?: string
  industry?: string
  size?: 'small' | 'medium' | 'large' | 'enterprise'
  planType?: string
  isActive?: boolean
  createdAt?: string
  totalUsers?: number
  totalInvoices?: number
  totalRevenue?: number
  country?: string
  timezone?: string
}

// Business Events Enum
export enum BusinessEvent {
  // Authentication Events
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  PASSWORD_RESET = 'password.reset',
  EMAIL_VERIFIED = 'email.verified',
  
  // Tenant Events
  TENANT_CREATED = 'tenant.created',
  TENANT_SWITCHED = 'tenant.switched',
  USER_INVITED = 'user.invited',
  USER_JOINED = 'user.joined',
  
  // Invoice Events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_VIEWED = 'invoice.viewed',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_VOIDED = 'invoice.voided',
  INVOICE_OVERDUE = 'invoice.overdue',
  PAYMENT_RECORDED = 'invoice.payment_recorded',
  
  // Customer Events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Inventory Events
  INVENTORY_ITEM_CREATED = 'inventory_item.created',
  INVENTORY_ITEM_UPDATED = 'inventory_item.updated',
  INVENTORY_ITEM_DELETED = 'inventory_item.deleted',
  STOCK_ADJUSTED = 'inventory.stock_adjusted',
  STOCK_TRANSFERRED = 'inventory.stock_transferred',
  LOW_STOCK_ALERT = 'inventory.low_stock_alert',
  
  // GST Events
  GST_CALCULATION_PERFORMED = 'gst.calculation_performed',
  GSTIN_VALIDATED = 'gst.gstin_validated',
  GSTR1_GENERATED = 'gst.gstr1_generated',
  GSTR3B_GENERATED = 'gst.gstr3b_generated',
  GST_RETURN_FILED = 'gst.return_filed',
  
  // Financial Events
  JOURNAL_ENTRY_CREATED = 'journal_entry.created',
  TRIAL_BALANCE_GENERATED = 'trial_balance.generated',
  PROFIT_LOSS_GENERATED = 'profit_loss.generated',
  BALANCE_SHEET_GENERATED = 'balance_sheet.generated',
  
  // API Events
  API_CALL = 'api_call',
  API_ERROR = 'api_error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Feature Usage
  FEATURE_USED = 'feature.used',
  HELP_VIEWED = 'help.viewed',
  EXPORT_GENERATED = 'export.generated',
  IMPORT_COMPLETED = 'import.completed',
  
  // Performance Events
  PAGE_LOAD = '$pageview',
  SLOW_QUERY = 'performance.slow_query',
  ERROR_OCCURRED = 'error.occurred'
}

// Event property schemas for validation
export const InvoiceEventPropsSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string(),
  customerId: z.string().uuid(),
  totalAmount: z.number(),
  taxAmount: z.number().optional(),
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']),
  daysToPayment: z.number().optional(),
  lineItemsCount: z.number().optional()
})

export const CustomerEventPropsSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  hasGSTIN: z.boolean(),
  creditLimit: z.number().optional(),
  totalInvoices: z.number().optional(),
  totalRevenue: z.number().optional()
})

export const InventoryEventPropsSchema = z.object({
  inventoryItemId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  category: z.string().optional(),
  currentStock: z.number().optional(),
  minStockLevel: z.number().optional(),
  value: z.number().optional()
})

export const GSTEventPropsSchema = z.object({
  amount: z.number(),
  gstRate: z.number(),
  isInterState: z.boolean(),
  totalTax: z.number(),
  gstin: z.string().optional(),
  returnPeriod: z.string().optional(),
  validationErrors: z.number().optional()
})

export const FinancialEventPropsSchema = z.object({
  reportType: z.string(),
  asOfDate: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  totalAccounts: z.number().optional(),
  totalAmount: z.number().optional(),
  isBalanced: z.boolean().optional()
})

export const APIEventPropsSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  statusCode: z.number(),
  duration: z.number(),
  responseSize: z.number().optional(),
  errorType: z.string().optional(),
  userAgent: z.string().optional()
})

// Analytics metrics that we want to track
export interface BusinessMetrics {
  // Revenue Metrics
  totalRevenue: number
  monthlyRecurringRevenue: number
  averageInvoiceValue: number
  revenueGrowthRate: number
  
  // Customer Metrics
  totalCustomers: number
  activeCustomers: number
  customerAcquisitionCost: number
  customerLifetimeValue: number
  customerRetentionRate: number
  
  // Invoice Metrics
  totalInvoices: number
  paidInvoices: number
  overdueInvoices: number
  averagePaymentTime: number
  invoiceConversionRate: number
  
  // Inventory Metrics
  totalInventoryItems: number
  lowStockItems: number
  inventoryTurnoverRatio: number
  totalInventoryValue: number
  
  // GST Metrics
  totalGSTCollected: number
  gstReturnsFiled: number
  gstComplianceScore: number
  
  // User Metrics
  totalUsers: number
  activeUsers: number
  userEngagementScore: number
  featureAdoptionRate: number
}

// Cohort analysis data
export interface CohortData {
  cohortName: string
  period: string
  totalUsers: number
  retainedUsers: Record<string, number> // period -> retained count
  retentionRate: Record<string, number> // period -> retention %
  revenue: Record<string, number> // period -> revenue
}

// Funnel analysis steps
export interface FunnelStep {
  step: number
  eventName: string
  userCount: number
  conversionRate: number
  dropOffRate: number
}

// A/B test configuration
export interface ABTestConfig {
  testId: string
  name: string
  description: string
  startDate: Date
  endDate?: Date
  variants: Array<{
    id: string
    name: string
    weight: number // 0-100
  }>
  targetingRules?: Record<string, any>
  conversionEvent: string
}

// Feature flag configuration
export interface FeatureFlag {
  key: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  conditions?: Array<{
    property: string
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt'
    value: any
  }>
}

// Analytics query interfaces
export interface TimeSeriesQuery {
  event: string
  dateRange: {
    from: Date
    to: Date
  }
  interval: 'hour' | 'day' | 'week' | 'month'
  filters?: Record<string, any>
  breakdowns?: string[]
}

export interface FunnelQuery {
  steps: Array<{
    event: string
    filters?: Record<string, any>
  }>
  dateRange: {
    from: Date
    to: Date
  }
  conversionWindow: number // in days
}

// Dashboard configuration
export interface DashboardConfig {
  id: string
  name: string
  description: string
  widgets: Array<{
    id: string
    type: 'metric' | 'chart' | 'table' | 'funnel' | 'cohort'
    title: string
    query: TimeSeriesQuery | FunnelQuery | any
    position: { x: number; y: number; w: number; h: number }
  }>
  refreshInterval: number // in minutes
  permissions?: Array<{
    role: string
    access: 'read' | 'write' | 'admin'
  }>
}

// Error tracking types
export interface ErrorDetails {
  message: string
  stack?: string
  code?: string | number
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'validation' | 'database' | 'api' | 'auth' | 'payment' | 'gst' | 'other'
  context?: Record<string, any>
  userImpact: boolean
  resolved?: boolean
  resolvedAt?: Date
}

// Performance monitoring
export interface PerformanceMetrics {
  endpoint: string
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestCount: number
  errorRate: number
  throughput: number
  slowQueries?: Array<{
    query: string
    duration: number
    count: number
  }>
}

export type EventProperties = 
  | z.infer<typeof InvoiceEventPropsSchema>
  | z.infer<typeof CustomerEventPropsSchema>
  | z.infer<typeof InventoryEventPropsSchema>
  | z.infer<typeof GSTEventPropsSchema>
  | z.infer<typeof FinancialEventPropsSchema>
  | z.infer<typeof APIEventPropsSchema>
  | Record<string, any>

// Analytics errors
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AnalyticsError'
  }
}

export class TrackingError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'TRACKING_ERROR', details)
  }
}