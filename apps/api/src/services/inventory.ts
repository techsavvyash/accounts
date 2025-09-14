import { prisma } from '@accounts/database'
import { trackEvent } from '../middleware/posthog'

export class InventoryService {
  /**
   * Create a new inventory item
   */
  static async createInventoryItem(
    tenantId: string,
    itemData: {
      name: string
      description?: string
      sku: string
      hsnCode?: string
      purchasePrice?: number
      salePrice?: number
      reorderPoint?: number
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Check if SKU already exists for this tenant
      const existingItem = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          sku: itemData.sku
        }
      })

      if (existingItem) {
        throw new Error('SKU already exists for this tenant')
      }

      // Create the inventory item
      const inventoryItem = await tx.inventoryItem.create({
        data: {
          tenantId,
          name: itemData.name,
          description: itemData.description,
          sku: itemData.sku,
          hsnCode: itemData.hsnCode,
          purchasePrice: itemData.purchasePrice,
          salePrice: itemData.salePrice,
          reorderPoint: itemData.reorderPoint
        }
      })

      // Initialize stock level for default warehouse if any exists
      const defaultWarehouse = await tx.warehouse.findFirst({
        where: { tenantId }
      })

      if (defaultWarehouse) {
        await tx.stockLevel.create({
          data: {
            inventoryItemId: inventoryItem.id,
            warehouseId: defaultWarehouse.id,
            quantityOnHand: 0,
            committedQuantity: 0
          }
        })
      }

      return inventoryItem
    })
  }

  /**
   * Get inventory items with pagination and filtering
   */
  static async getInventoryItems(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      search?: string
      category?: string
      lowStockOnly?: boolean
    } = {}
  ) {
    const { page = 1, limit = 50, search, category, lowStockOnly } = options

    const whereClause: any = { tenantId }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      whereClause.category = category
    }

    const [items, totalCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: whereClause,
        include: {
          stockLevels: {
            include: {
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  isDefault: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.inventoryItem.count({ where: whereClause })
    ])

    // Filter for low stock if requested
    let filteredItems = items
    if (lowStockOnly) {
      filteredItems = items.filter(item => {
        const totalStock = item.stockLevels.reduce(
          (sum, level) => sum + level.quantityOnHand.toNumber(),
          0
        )
        return item.minStockLevel && totalStock <= item.minStockLevel.toNumber()
      })
    }

    return {
      items: filteredItems.map(item => ({
        ...item,
        totalStock: item.stockLevels.reduce(
          (sum, level) => sum + level.quantityOnHand.toNumber(),
          0
        ),
        availableStock: item.stockLevels.reduce(
          (sum, level) => sum + (level.quantityOnHand.toNumber() - level.committedQuantity.toNumber()),
          0
        )
      })),
      pagination: {
        page,
        limit,
        total: lowStockOnly ? filteredItems.length : totalCount,
        totalPages: Math.ceil((lowStockOnly ? filteredItems.length : totalCount) / limit)
      }
    }
  }

  /**
   * Get single inventory item by ID
   */
  static async getInventoryItemById(tenantId: string, itemId: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId
      },
      include: {
        stockLevels: {
          include: {
            warehouse: true
          }
        },
        stockMovements: {
          include: {
            fromWarehouse: {
              select: { name: true }
            },
            toWarehouse: {
              select: { name: true }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20 // Last 20 movements
        }
      }
    })

    if (!item) {
      throw new Error('Inventory item not found')
    }

    return {
      ...item,
      totalStock: item.stockLevels.reduce(
        (sum, level) => sum + level.quantityOnHand.toNumber(),
        0
      ),
      availableStock: item.stockLevels.reduce(
        (sum, level) => sum + (level.quantityOnHand.toNumber() - level.committedQuantity.toNumber()),
        0
      )
    }
  }

  /**
   * Update inventory item
   */
  static async updateInventoryItem(
    tenantId: string,
    userId: string,
    itemId: string,
    updateData: {
      name?: string
      description?: string
      basePrice?: number
      minStockLevel?: number
      maxStockLevel?: number
    }
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId
      }
    })

    if (!item) {
      throw new Error('Inventory item not found')
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    })

    // Track event
    trackEvent('inventory_item.updated', {
      inventoryItemId: itemId,
      changes: Object.keys(updateData)
    }, userId, tenantId)

    return updatedItem
  }

  /**
   * Adjust stock levels (add, remove, or set)
   */
  static async adjustStock(
    tenantId: string,
    userId: string,
    adjustmentData: {
      inventoryItemId: string
      warehouseId?: string
      adjustmentType: 'ADD' | 'REMOVE' | 'SET'
      quantity: number
      reason: string
      referenceId?: string
      notes?: string
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Verify inventory item exists
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          id: adjustmentData.inventoryItemId,
          tenantId
        }
      })

      if (!inventoryItem) {
        throw new Error('Inventory item not found')
      }

      // Get warehouse (default if not specified)
      let warehouse
      if (adjustmentData.warehouseId) {
        warehouse = await tx.warehouse.findFirst({
          where: {
            id: adjustmentData.warehouseId,
            tenantId
          }
        })
      } else {
        warehouse = await tx.warehouse.findFirst({
          where: { tenantId, isDefault: true }
        })
      }

      if (!warehouse) {
        throw new Error('Warehouse not found')
      }

      // Get current stock level
      const currentStockLevel = await tx.stockLevel.findUnique({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: adjustmentData.inventoryItemId,
            warehouseId: warehouse.id
          }
        }
      })

      const currentQuantity = currentStockLevel?.quantityOnHand.toNumber() || 0

      // Calculate new quantity based on adjustment type
      let newQuantity: number
      switch (adjustmentData.adjustmentType) {
        case 'ADD':
          newQuantity = currentQuantity + adjustmentData.quantity
          break
        case 'REMOVE':
          newQuantity = currentQuantity - adjustmentData.quantity
          if (newQuantity < 0) {
            throw new Error('Insufficient stock for removal')
          }
          break
        case 'SET':
          newQuantity = adjustmentData.quantity
          break
        default:
          throw new Error('Invalid adjustment type')
      }

      // Update or create stock level
      const updatedStockLevel = await tx.stockLevel.upsert({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: adjustmentData.inventoryItemId,
            warehouseId: warehouse.id
          }
        },
        create: {
          inventoryItemId: adjustmentData.inventoryItemId,
          warehouseId: warehouse.id,
          quantityOnHand: newQuantity,
          committedQuantity: 0,
          lastUpdated: new Date()
        },
        update: {
          quantityOnHand: newQuantity,
          lastUpdated: new Date()
        }
      })

      // Create stock movement record
      const movementType = adjustmentData.adjustmentType === 'ADD' || 
                         (adjustmentData.adjustmentType === 'SET' && newQuantity > currentQuantity)
                         ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'

      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          inventoryItemId: adjustmentData.inventoryItemId,
          fromWarehouseId: movementType === 'ADJUSTMENT_OUT' ? warehouse.id : undefined,
          toWarehouseId: movementType === 'ADJUSTMENT_IN' ? warehouse.id : undefined,
          quantity: Math.abs(adjustmentData.quantity),
          reason: movementType,
          referenceId: adjustmentData.referenceId,
          notes: adjustmentData.notes,
          createdBy: userId
        }
      })

      // Track event
      trackEvent('inventory.stock_adjusted', {
        inventoryItemId: adjustmentData.inventoryItemId,
        warehouseId: warehouse.id,
        adjustmentType: adjustmentData.adjustmentType,
        quantity: adjustmentData.quantity,
        newQuantity,
        reason: adjustmentData.reason
      }, userId, tenantId)

      return {
        stockLevel: updatedStockLevel,
        movement,
        previousQuantity: currentQuantity,
        newQuantity
      }
    })
  }

  /**
   * Transfer stock between warehouses
   */
  static async transferStock(
    tenantId: string,
    userId: string,
    transferData: {
      inventoryItemId: string
      fromWarehouseId: string
      toWarehouseId: string
      quantity: number
      notes?: string
      referenceId?: string
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Verify inventory item
      const inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          id: transferData.inventoryItemId,
          tenantId
        }
      })

      if (!inventoryItem) {
        throw new Error('Inventory item not found')
      }

      // Verify warehouses
      const [fromWarehouse, toWarehouse] = await Promise.all([
        tx.warehouse.findFirst({
          where: { id: transferData.fromWarehouseId, tenantId }
        }),
        tx.warehouse.findFirst({
          where: { id: transferData.toWarehouseId, tenantId }
        })
      ])

      if (!fromWarehouse || !toWarehouse) {
        throw new Error('One or both warehouses not found')
      }

      if (transferData.fromWarehouseId === transferData.toWarehouseId) {
        throw new Error('Cannot transfer to the same warehouse')
      }

      // Check available stock in source warehouse
      const fromStockLevel = await tx.stockLevel.findUnique({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: transferData.inventoryItemId,
            warehouseId: transferData.fromWarehouseId
          }
        }
      })

      const availableQuantity = fromStockLevel 
        ? fromStockLevel.quantityOnHand.toNumber() - fromStockLevel.committedQuantity.toNumber()
        : 0

      if (availableQuantity < transferData.quantity) {
        throw new Error('Insufficient available stock for transfer')
      }

      // Update source warehouse stock (decrease)
      await tx.stockLevel.update({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: transferData.inventoryItemId,
            warehouseId: transferData.fromWarehouseId
          }
        },
        data: {
          quantityOnHand: {
            decrement: transferData.quantity
          },
          lastUpdated: new Date()
        }
      })

      // Update destination warehouse stock (increase)
      await tx.stockLevel.upsert({
        where: {
          inventoryItemId_warehouseId: {
            inventoryItemId: transferData.inventoryItemId,
            warehouseId: transferData.toWarehouseId
          }
        },
        create: {
          inventoryItemId: transferData.inventoryItemId,
          warehouseId: transferData.toWarehouseId,
          quantityOnHand: transferData.quantity,
          committedQuantity: 0,
          lastUpdated: new Date()
        },
        update: {
          quantityOnHand: {
            increment: transferData.quantity
          },
          lastUpdated: new Date()
        }
      })

      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          tenantId,
          inventoryItemId: transferData.inventoryItemId,
          fromWarehouseId: transferData.fromWarehouseId,
          toWarehouseId: transferData.toWarehouseId,
          quantity: transferData.quantity,
          reason: 'TRANSFER',
          referenceId: transferData.referenceId,
          notes: transferData.notes,
          createdBy: userId
        }
      })

      // Track event
      trackEvent('inventory.stock_transferred', {
        inventoryItemId: transferData.inventoryItemId,
        fromWarehouseId: transferData.fromWarehouseId,
        toWarehouseId: transferData.toWarehouseId,
        quantity: transferData.quantity
      }, userId, tenantId)

      return movement
    })
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(tenantId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        reorderPoint: {
          not: null
        }
      },
      include: {
        stockLevels: {
          include: {
            warehouse: {
              select: {
                name: true,
                isDefault: true
              }
            }
          }
        }
      }
    })

    const lowStockItems = items.filter(item => {
      if (!item.minStockLevel) return false
      
      const totalStock = item.stockLevels.reduce(
        (sum, level) => sum + level.quantityOnHand.toNumber(),
        0
      )
      
      return totalStock <= item.minStockLevel.toNumber()
    })

    return lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      currentStock: item.stockLevels.reduce(
        (sum, level) => sum + level.quantityOnHand.toNumber(),
        0
      ),
      minStockLevel: item.minStockLevel?.toNumber() || 0,
      stockLevels: item.stockLevels.map(level => ({
        warehouse: level.warehouse.name,
        isDefault: level.warehouse.isDefault,
        quantity: level.quantityOnHand.toNumber(),
        available: level.quantityOnHand.toNumber() - level.committedQuantity.toNumber()
      }))
    }))
  }

  /**
   * Get stock movement history
   */
  static async getStockMovements(
    tenantId: string,
    options: {
      inventoryItemId?: string
      warehouseId?: string
      fromDate?: Date
      toDate?: Date
      reason?: string
      page?: number
      limit?: number
    } = {}
  ) {
    const {
      inventoryItemId,
      warehouseId,
      fromDate,
      toDate,
      reason,
      page = 1,
      limit = 50
    } = options

    const whereClause: any = { tenantId }

    if (inventoryItemId) whereClause.inventoryItemId = inventoryItemId
    if (warehouseId) {
      whereClause.OR = [
        { fromWarehouseId: warehouseId },
        { toWarehouseId: warehouseId }
      ]
    }
    if (reason) whereClause.reason = reason
    if (fromDate || toDate) {
      whereClause.createdAt = {}
      if (fromDate) whereClause.createdAt.gte = fromDate
      if (toDate) whereClause.createdAt.lte = toDate
    }

    const [movements, totalCount] = await Promise.all([
      prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          inventoryItem: {
            select: {
              name: true,
              sku: true
            }
          },
          fromWarehouse: {
            select: {
              name: true
            }
          },
          toWarehouse: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.stockMovement.count({ where: whereClause })
    ])

    return {
      movements,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }
  }

  /**
   * Delete inventory item (soft delete)
   */
  static async deleteInventoryItem(
    tenantId: string,
    userId: string,
    itemId: string
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId
      },
      include: {
        stockLevels: true
      }
    })

    if (!item) {
      throw new Error('Inventory item not found')
    }

    // Check if item has stock
    const hasStock = item.stockLevels.some(level => level.quantityOnHand.toNumber() > 0)
    if (hasStock) {
      throw new Error('Cannot delete inventory item with existing stock')
    }

    // Delete the inventory item
    const deletedItem = await prisma.inventoryItem.delete({
      where: { id: itemId }
    })

    // Track event
    trackEvent('inventory_item.deleted', {
      inventoryItemId: itemId,
      sku: item.sku
    }, userId, tenantId)

    return deletedItem
  }
}