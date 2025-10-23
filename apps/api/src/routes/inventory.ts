import { Elysia, t } from 'elysia'
import { InventoryService } from '../services/inventory'
import { requirePermission } from '../middleware/auth'

export const inventoryRoutes = new Elysia({ prefix: '/inventory' })
  // Get inventory levels and stock status
  .get(
    '/',
    async ({ query, store, posthog }) => {
      try {
        const inventory = await InventoryService.getInventoryItems(store.tenantId, {
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          search: query.search,
          category: query.category,
          lowStockOnly: query.lowStockOnly === 'true'
        })

        posthog?.track('inventory.listed', {
          totalItems: inventory.pagination.total,
          filters: {
            search: !!query.search,
            category: query.category,
            lowStockOnly: query.lowStockOnly === 'true'
          }
        })

        return {
          success: true,
          data: inventory
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch inventory'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'read'),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        category: t.Optional(t.String()),
        lowStockOnly: t.Optional(t.String())
      })
    }
  )

  // Create new inventory item
  .post(
    '/',
    async ({ body, store, set, posthog }) => {
      try {
        const item = await InventoryService.createInventoryItem(
          store.tenantId,
          {
            name: body.name,
            sku: body.sku,
            description: body.description,
            hsnCode: body.hsnCode,
            purchasePrice: body.purchasePrice,
            salePrice: body.salePrice,
            reorderPoint: body.reorderPoint
          }
        )

        posthog?.track('inventory.item_created', {
          itemId: item.id,
          name: item.name,
          sku: item.sku
        })

        set.status = 201
        return {
          success: true,
          message: 'Inventory item created successfully',
          data: item
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message || 'Failed to create inventory item'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'create'),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        sku: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        hsnCode: t.Optional(t.String()),
        unitType: t.Optional(t.Union([
          t.Literal('PIECE'),
          t.Literal('KG'),
          t.Literal('LITRE'),
          t.Literal('METRE')
        ])),
        purchasePrice: t.Optional(t.Number({ minimum: 0 })),
        salePrice: t.Optional(t.Number({ minimum: 0 })),
        reorderPoint: t.Optional(t.Number({ minimum: 0 })),
        maxStockLevel: t.Optional(t.Number({ minimum: 0 })),
        isActive: t.Optional(t.Boolean())
      })
    }
  )

  // Stock adjustment endpoint
  .post(
    '/adjustment',
    async ({ body, store, set, posthog }) => {
      try {
        const result = await InventoryService.adjustStock(
          store.tenantId,
          store.userId,
          {
            inventoryItemId: body.inventoryItemId,
            warehouseId: body.warehouseId,
            adjustmentType: body.adjustmentType,
            quantity: body.quantity,
            reason: body.reason,
            referenceId: body.referenceId,
            notes: body.notes
          }
        )

        posthog?.track('inventory.stock_adjusted', {
          inventoryItemId: body.inventoryItemId,
          adjustmentType: body.adjustmentType,
          quantity: body.quantity,
          reason: body.reason
        })

        return {
          success: true,
          message: 'Stock adjustment completed successfully',
          data: result
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'update'),
      body: t.Object({
        inventoryItemId: t.String(),
        warehouseId: t.Optional(t.String()),
        adjustmentType: t.Union([
          t.Literal('ADD'),
          t.Literal('REMOVE'),
          t.Literal('SET')
        ]),
        quantity: t.Number({ minimum: 0 }),
        reason: t.String({ minLength: 1 }),
        referenceId: t.Optional(t.String()),
        notes: t.Optional(t.String())
      })
    }
  )

  // Stock transfer between warehouses
  .post(
    '/transfer',
    async ({ body, store, set, posthog }) => {
      try {
        const movement = await InventoryService.transferStock(
          store.tenantId,
          store.userId,
          {
            inventoryItemId: body.inventoryItemId,
            fromWarehouseId: body.fromWarehouseId,
            toWarehouseId: body.toWarehouseId,
            quantity: body.quantity,
            notes: body.notes,
            referenceId: body.referenceId
          }
        )

        posthog?.track('inventory.stock_transferred', {
          inventoryItemId: body.inventoryItemId,
          fromWarehouseId: body.fromWarehouseId,
          toWarehouseId: body.toWarehouseId,
          quantity: body.quantity
        })

        return {
          success: true,
          message: 'Stock transfer completed successfully',
          data: movement
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'update'),
      body: t.Object({
        inventoryItemId: t.String(),
        fromWarehouseId: t.String(),
        toWarehouseId: t.String(),
        quantity: t.Number({ minimum: 0.001 }),
        notes: t.Optional(t.String()),
        referenceId: t.Optional(t.String())
      })
    }
  )

  // Get stock levels for all inventory items
  .get(
    '/stock-levels',
    async ({ store, posthog }) => {
      try {
        const { prisma } = await import('@accounts/database')

        const stockLevels = await prisma.stockLevel.findMany({
          where: {
            inventoryItem: {
              tenantId: store.tenantId
            }
          },
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                isDefault: true
              }
            }
          }
        })

        posthog?.track('inventory.stock_levels_viewed', {
          totalItems: stockLevels.length
        })

        return {
          success: true,
          data: stockLevels.map(level => ({
            inventoryItemId: level.inventoryItemId,
            inventoryItemName: level.inventoryItem.name,
            inventoryItemSku: level.inventoryItem.sku,
            warehouseId: level.warehouseId,
            warehouseName: level.warehouse.name,
            isDefaultWarehouse: level.warehouse.isDefault,
            quantityOnHand: level.quantityOnHand,
            lastUpdated: level.lastUpdated
          }))
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch stock levels'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'read')
    }
  )

  // Get low stock items
  .get(
    '/low-stock',
    async ({ store, posthog }) => {
      try {
        const lowStockItems = await InventoryService.getLowStockItems(store.tenantId)

        posthog?.track('inventory.low_stock_viewed', {
          lowStockCount: lowStockItems.length
        })

        return {
          success: true,
          data: lowStockItems
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch low stock items'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'read')
    }
  )

  // Get stock movements/history
  .get(
    '/movements',
    async ({ query, store, posthog }) => {
      try {
        const movements = await InventoryService.getStockMovements(store.tenantId, {
          inventoryItemId: query.inventoryItemId,
          warehouseId: query.warehouseId,
          fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
          toDate: query.toDate ? new Date(query.toDate) : undefined,
          reason: query.reason,
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined
        })

        posthog?.track('inventory.movements_viewed', {
          totalMovements: movements.pagination.total,
          filters: {
            inventoryItemId: query.inventoryItemId,
            warehouseId: query.warehouseId,
            reason: query.reason,
            hasDateRange: !!(query.fromDate || query.toDate)
          }
        })

        return {
          success: true,
          data: movements
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch stock movements'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'read'),
      query: t.Object({
        inventoryItemId: t.Optional(t.String()),
        warehouseId: t.Optional(t.String()),
        fromDate: t.Optional(t.String({ format: 'date' })),
        toDate: t.Optional(t.String({ format: 'date' })),
        reason: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  // Get individual inventory item details
  .get(
    '/:id',
    async ({ params, store, set }) => {
      try {
        const item = await InventoryService.getInventoryItemById(store.tenantId, params.id)

        return {
          success: true,
          data: item
        }
      } catch (error: any) {
        if (error.message === 'Inventory item not found') {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: error.message
          }
        }

        set.status = 500
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch inventory item'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )