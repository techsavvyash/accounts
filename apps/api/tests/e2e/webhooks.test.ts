import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'
import { WebhookEventType } from '@accounts/webhooks'

describe('Webhook Integration End-to-End Tests', () => {
  let authData: any
  
  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })
  
  it('should create and manage webhook endpoints', async () => {
    // Create webhook endpoint
    const webhookData = {
      url: 'https://webhook.site/test-endpoint',
      events: [WebhookEventType.INVOICE_CREATED, WebhookEventType.CUSTOMER_CREATED],
      description: 'Test webhook endpoint'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    expect(createResponse.status).toBe(201)
    
    const createResult = await createResponse.json()
    expect(createResult.success).toBe(true)
    expect(createResult.data.url).toBe(webhookData.url)
    expect(createResult.data.events).toEqual(webhookData.events)
    expect(createResult.data.isActive).toBe(true)
    expect(createResult.data.secret).toBeDefined()
    
    const webhookId = createResult.data.id
    
    // Get webhook list
    const listResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/webhooks',
      authData.token
    )
    
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    expect(listResult.success).toBe(true)
    expect(listResult.data.length).toBe(1)
    expect(listResult.data[0].id).toBe(webhookId)
    
    // Get specific webhook
    const detailResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/webhooks/${webhookId}`,
      authData.token
    )
    
    expect(detailResponse.status).toBe(200)
    
    const detailResult = await detailResponse.json()
    expect(detailResult.success).toBe(true)
    expect(detailResult.data.id).toBe(webhookId)
    expect(detailResult.data.secret).toBe('***') // Secret should be hidden
  })
  
  it('should update webhook endpoint configuration', async () => {
    // Create webhook endpoint
    const webhookData = {
      url: 'https://test.example.com/webhook',
      events: [WebhookEventType.INVOICE_CREATED],
      description: 'Initial webhook'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    const createResult = await createResponse.json()
    const webhookId = createResult.data.id
    
    // Update webhook
    const updateData = {
      url: 'https://updated.example.com/webhook',
      events: [WebhookEventType.INVOICE_CREATED, WebhookEventType.INVOICE_PAID],
      description: 'Updated webhook',
      isActive: false
    }
    
    const updateResponse = await TestHelpers.makeAuthenticatedRequest(
      'PUT',
      `/api/webhooks/${webhookId}`,
      authData.token,
      updateData
    )
    
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.success).toBe(true)
    expect(updateResult.data.url).toBe(updateData.url)
    expect(updateResult.data.events).toEqual(updateData.events)
    expect(updateResult.data.description).toBe(updateData.description)
    expect(updateResult.data.isActive).toBe(false)
  })
  
  it('should delete webhook endpoint', async () => {
    // Create webhook endpoint
    const webhookData = {
      url: 'https://temp.example.com/webhook',
      events: [WebhookEventType.CUSTOMER_CREATED],
      description: 'Temporary webhook'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    const createResult = await createResponse.json()
    const webhookId = createResult.data.id
    
    // Delete webhook
    const deleteResponse = await TestHelpers.makeAuthenticatedRequest(
      'DELETE',
      `/api/webhooks/${webhookId}`,
      authData.token
    )
    
    expect(deleteResponse.status).toBe(200)
    
    const deleteResult = await deleteResponse.json()
    expect(deleteResult.success).toBe(true)
    
    // Verify webhook is deleted
    const getResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/webhooks/${webhookId}`,
      authData.token
    )
    
    expect(getResponse.status).toBe(404)
  })
  
  it('should get webhook event types', async () => {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/webhooks/events',
      authData.token
    )
    
    expect(response.status).toBe(200)
    
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.events).toBeDefined()
    expect(result.data.categorized).toBeDefined()
    
    // Check that major event types are present
    const eventValues = result.data.events.map((e: any) => e.value)
    expect(eventValues).toContain(WebhookEventType.INVOICE_CREATED)
    expect(eventValues).toContain(WebhookEventType.CUSTOMER_CREATED)
    expect(eventValues).toContain(WebhookEventType.INVENTORY_ITEM_CREATED)
  })
  
  it('should get webhook statistics', async () => {
    // Create webhook endpoint
    const webhookData = {
      url: 'https://stats.example.com/webhook',
      events: [WebhookEventType.INVOICE_CREATED],
      description: 'Stats test webhook'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    const createResult = await createResponse.json()
    const webhookId = createResult.data.id
    
    // Get statistics (should be empty initially)
    const statsResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/webhooks/${webhookId}/stats`,
      authData.token
    )
    
    expect(statsResponse.status).toBe(200)
    
    const statsResult = await statsResponse.json()
    expect(statsResult.success).toBe(true)
    expect(statsResult.data.totalEvents).toBe(0)
    expect(statsResult.data.deliveredEvents).toBe(0)
    expect(statsResult.data.failedEvents).toBe(0)
  })
  
  it('should test webhook endpoint connectivity', async () => {
    // Create webhook endpoint
    const webhookData = {
      url: 'https://httpbin.org/post', // This should accept POST requests
      events: [WebhookEventType.CUSTOMER_CREATED],
      description: 'Test connectivity webhook'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    const createResult = await createResponse.json()
    const webhookId = createResult.data.id
    
    // Test webhook connectivity
    const testResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      `/api/webhooks/${webhookId}/test`,
      authData.token
    )
    
    expect(testResponse.status).toBe(200)
    
    const testResult = await testResponse.json()
    expect(testResult.success).toBe(true)
    expect(testResult.message).toContain('Test webhook sent successfully')
  })
  
  it('should validate webhook endpoint URL format', async () => {
    const invalidWebhookData = {
      url: 'not-a-valid-url',
      events: [WebhookEventType.INVOICE_CREATED],
      description: 'Invalid URL test'
    }
    
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      invalidWebhookData
    )
    
    expect(response.status).toBe(400)
    
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('url')
  })
  
  it('should require at least one event type', async () => {
    const invalidWebhookData = {
      url: 'https://valid.example.com/webhook',
      events: [], // Empty events array
      description: 'No events test'
    }
    
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      invalidWebhookData
    )
    
    expect(response.status).toBe(400)
    
    const result = await response.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('events')
  })
  
  it('should prevent access to other tenants webhook endpoints', async () => {
    // Create first tenant and webhook
    const webhookData = {
      url: 'https://tenant1.example.com/webhook',
      events: [WebhookEventType.INVOICE_CREATED],
      description: 'Tenant 1 webhook'
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/webhooks',
      authData.token,
      webhookData
    )
    
    const createResult = await createResponse.json()
    const webhookId = createResult.data.id
    
    // Create second tenant and try to access first tenant's webhook
    const secondTenantAuth = await TestHelpers.createAuthenticatedUser()
    
    const accessResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/webhooks/${webhookId}`,
      secondTenantAuth.token
    )
    
    expect(accessResponse.status).toBe(404)
    
    const accessResult = await accessResponse.json()
    expect(accessResult.success).toBe(false)
    expect(accessResult.error).toContain('not found')
  })
})