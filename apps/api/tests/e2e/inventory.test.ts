import { describe, it, expect, beforeEach } from 'bun:test'
import { testApp, testData, TestHelpers, cleanupDatabase } from '../setup'

describe('Inventory Management End-to-End Tests', () => {
  let authData: any
  
  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })
  
  it('should create and retrieve inventory items', async () => {
    // Create inventory item
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    expect(createResponse.status).toBe(201)
    
    const createResult = await createResponse.json()
    expect(createResult.success).toBe(true)
    expect(createResult.data.name).toBe(testData.inventoryItem.name)
    expect(createResult.data.sku).toBe(testData.inventoryItem.sku)
    
    const itemId = createResult.data.id
    
    // Retrieve inventory items
    const listResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/inventory',
      authData.token
    )
    
    expect(listResponse.status).toBe(200)
    
    const listResult = await listResponse.json()
    expect(listResult.success).toBe(true)
    expect(listResult.data.length).toBe(1)
    expect(listResult.data[0].id).toBe(itemId)
  })
  
  it('should update inventory item', async () => {
    // Create inventory item
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    const createResult = await createResponse.json()
    const itemId = createResult.data.id
    
    // Update inventory item
    const updateData = {
      name: 'Updated Test Product',
      salePrice: 200.00
    }
    
    const updateResponse = await TestHelpers.makeAuthenticatedRequest(
      'PUT',
      `/api/inventory/${itemId}`,
      authData.token,
      updateData
    )
    
    expect(updateResponse.status).toBe(200)
    
    const updateResult = await updateResponse.json()
    expect(updateResult.success).toBe(true)
    expect(updateResult.data.name).toBe(updateData.name)
    expect(Number(updateResult.data.salePrice)).toBe(updateData.salePrice)
  })
  
  it('should handle stock movements', async () => {
    // Create inventory item
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    const createResult = await createResponse.json()
    const itemId = createResult.data.id
    
    // Add stock
    const stockData = {
      inventoryItemId: itemId,
      warehouseId: null, // Default warehouse
      quantity: 100,
      type: 'INWARD',
      reason: 'Initial stock',
      unitCost: 100.00
    }
    
    const stockResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory/stock-movement',
      authData.token,
      stockData
    )
    
    expect(stockResponse.status).toBe(201)
    
    const stockResult = await stockResponse.json()
    expect(stockResult.success).toBe(true)
    expect(stockResult.data.quantity).toBe(stockData.quantity)
    expect(stockResult.data.type).toBe(stockData.type)
    
    // Check stock level
    const stockLevelResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/inventory/${itemId}/stock`,
      authData.token
    )
    
    expect(stockLevelResponse.status).toBe(200)
    
    const stockLevelResult = await stockLevelResponse.json()
    expect(stockLevelResult.success).toBe(true)
    expect(stockLevelResult.data.totalStock).toBe(100)
  })
  
  it('should track low stock items', async () => {
    // Create inventory item with low reorder point
    const itemData = {
      ...testData.inventoryItem,
      reorderPoint: 50
    }
    
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      itemData
    )
    
    const createResult = await createResponse.json()
    const itemId = createResult.data.id
    
    // Add stock below reorder point
    const stockData = {
      inventoryItemId: itemId,
      warehouseId: null,
      quantity: 20,
      type: 'INWARD',
      reason: 'Low stock test',
      unitCost: 100.00
    }
    
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory/stock-movement',
      authData.token,
      stockData
    )
    
    // Check low stock alerts
    const lowStockResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      '/api/inventory/low-stock',
      authData.token
    )
    
    expect(lowStockResponse.status).toBe(200)
    
    const lowStockResult = await lowStockResponse.json()
    expect(lowStockResult.success).toBe(true)
    expect(lowStockResult.data.length).toBe(1)
    expect(lowStockResult.data[0].inventoryItemId).toBe(itemId)
  })
  
  it('should get stock movement history', async () => {
    // Create inventory item
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    const createResult = await createResponse.json()
    const itemId = createResult.data.id
    
    // Add multiple stock movements
    const movements = [
      { quantity: 100, type: 'INWARD', reason: 'Initial stock' },
      { quantity: 20, type: 'OUTWARD', reason: 'Sale' },
      { quantity: 50, type: 'INWARD', reason: 'Restock' }
    ]
    
    for (const movement of movements) {
      await TestHelpers.makeAuthenticatedRequest(
        'POST',
        '/api/inventory/stock-movement',
        authData.token,
        {
          inventoryItemId: itemId,
          warehouseId: null,
          unitCost: 100.00,
          ...movement
        }
      )
    }
    
    // Get movement history
    const historyResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/inventory/${itemId}/movements`,
      authData.token
    )
    
    expect(historyResponse.status).toBe(200)
    
    const historyResult = await historyResponse.json()
    expect(historyResult.success).toBe(true)
    expect(historyResult.data.length).toBe(3)
    
    // Verify movements are in chronological order (newest first)
    expect(historyResult.data[0].type).toBe('INWARD')
    expect(historyResult.data[0].quantity).toBe(50)
    expect(historyResult.data[1].type).toBe('OUTWARD')
    expect(historyResult.data[2].type).toBe('INWARD')
    expect(historyResult.data[2].quantity).toBe(100)
  })
  
  it('should handle inventory item deletion', async () => {
    // Create inventory item
    const createResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    const createResult = await createResponse.json()
    const itemId = createResult.data.id
    
    // Delete inventory item
    const deleteResponse = await TestHelpers.makeAuthenticatedRequest(
      'DELETE',
      `/api/inventory/${itemId}`,
      authData.token
    )
    
    expect(deleteResponse.status).toBe(200)
    
    const deleteResult = await deleteResponse.json()
    expect(deleteResult.success).toBe(true)
    
    // Verify item is deleted
    const getResponse = await TestHelpers.makeAuthenticatedRequest(
      'GET',
      `/api/inventory/${itemId}`,
      authData.token
    )
    
    expect(getResponse.status).toBe(404)
  })
  
  it('should prevent duplicate SKUs', async () => {
    // Create first inventory item
    await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    // Try to create another item with same SKU
    const duplicateResponse = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/inventory',
      authData.token,
      testData.inventoryItem
    )
    
    expect(duplicateResponse.status).toBe(400)
    
    const result = await duplicateResponse.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('SKU already exists')
  })
})