import { Elysia, t } from 'elysia'
import { InventoryService } from '../services/inventory'
import { requirePermission } from '../middleware/auth'

export const productRoutes = new Elysia({ prefix: '/products' })
  // List inventory items (products)
  .get(
    '/',
    async ({ query, store, posthog }) => {
      try {
        const inventory = await InventoryService.getInventoryItems(store.tenantId, {
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          search: query.search,
          category: query.category
        })

        posthog?.track('products.listed', {
          totalItems: inventory.pagination.total,
          filters: {
            search: !!query.search,
            category: query.category
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
          message: 'Failed to fetch products'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory_item', 'read'),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        category: t.Optional(t.String())
      })
    }
  )

  // Create new inventory item (product)
  .post(
    '/',
    async ({ body, store, set, posthog }) => {
      try {
        const inventoryItem = await InventoryService.createInventoryItem(
          store.tenantId,
          store.userId,
          {
            name: body.name,
            description: body.description,
            sku: body.sku,
            hsnCode: body.hsnCode,
            unitType: body.unitType,
            basePrice: body.basePrice,
            minStockLevel: body.minStockLevel,
            maxStockLevel: body.maxStockLevel
          }
        )

        posthog?.track('product.created', {
          inventoryItemId: inventoryItem.id,
          sku: body.sku,
          basePrice: body.basePrice,
          unitType: body.unitType
        })

        return {
          success: true,
          message: 'Product created successfully',
          data: inventoryItem
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
      beforeHandle: requirePermission('inventory_item', 'create'),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        sku: t.String({ minLength: 1, maxLength: 100 }),
        hsnCode: t.Optional(t.String()),
        unitType: t.Union([
          t.Literal('PIECE'),
          t.Literal('KG'),
          t.Literal('LITRE'),
          t.Literal('METRE')
        ]),
        basePrice: t.Number({ minimum: 0 }),
        minStockLevel: t.Optional(t.Number({ minimum: 0 })),
        maxStockLevel: t.Optional(t.Number({ minimum: 0 }))
      })
    }
  )

  // Get single product by ID
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
            message: 'Product not found'
          }
        }

        set.status = 500
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch product'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory_item', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Update product
  .put(
    '/:id',
    async ({ params, body, store, set, posthog }) => {
      try {
        const updatedItem = await InventoryService.updateInventoryItem(
          store.tenantId,
          store.userId,
          params.id,
          {
            name: body.name,
            description: body.description,
            basePrice: body.basePrice,
            minStockLevel: body.minStockLevel,
            maxStockLevel: body.maxStockLevel
          }
        )

        posthog?.track('product.updated', {
          inventoryItemId: params.id,
          changes: Object.keys(body).filter(key => body[key] !== undefined)
        })

        return {
          success: true,
          message: 'Product updated successfully',
          data: updatedItem
        }
      } catch (error: any) {
        if (error.message === 'Inventory item not found') {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: 'Product not found'
          }
        }

        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory_item', 'update'),
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        description: t.Optional(t.String()),
        basePrice: t.Optional(t.Number({ minimum: 0 })),
        minStockLevel: t.Optional(t.Number({ minimum: 0 })),
        maxStockLevel: t.Optional(t.Number({ minimum: 0 }))
      })
    }
  )

  // Delete product (soft delete)
  .delete(
    '/:id',
    async ({ params, store, set, posthog }) => {
      try {
        const deletedItem = await InventoryService.deleteInventoryItem(
          store.tenantId,
          store.userId,
          params.id
        )

        posthog?.track('product.deleted', {
          inventoryItemId: params.id
        })

        return {
          success: true,
          message: 'Product deleted successfully',
          data: { id: deletedItem.id }
        }
      } catch (error: any) {
        if (error.message === 'Inventory item not found') {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: 'Product not found'
          }
        }

        if (error.message === 'Cannot delete inventory item with existing stock') {
          set.status = 400
          return {
            success: false,
            error: 'Bad Request',
            message: 'Cannot delete product with existing stock'
          }
        }

        set.status = 500
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to delete product'
        }
      }
    },
    {
      beforeHandle: requirePermission('inventory_item', 'delete'),
      params: t.Object({
        id: t.String()
      })
    }
  )