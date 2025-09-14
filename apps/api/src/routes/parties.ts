import { Elysia, t } from 'elysia'
import { PartiesService } from '../services/parties'
import { requirePermission, requireAnyPermission } from '../middleware/auth'

export const partyRoutes = new Elysia({ prefix: '/parties' })
  // Get all parties (customers + suppliers)
  .get(
    '/',
    async ({ query, store, posthog }) => {
      try {
        const parties = await PartiesService.getParties(store.tenantId, {
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          search: query.search,
          type: query.type as 'customer' | 'supplier' | undefined,
          gstin: query.gstin
        })

        posthog?.track('parties.listed', {
          totalParties: parties.pagination.total,
          filters: {
            search: !!query.search,
            type: query.type,
            gstin: !!query.gstin
          }
        })

        return {
          success: true,
          data: parties
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch parties'
        }
      }
    },
    {
      beforeHandle: requireAnyPermission(['customer', 'supplier'], 'read'),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal('customer'), t.Literal('supplier')])),
        gstin: t.Optional(t.String())
      })
    }
  )

  // Get customers only
  .get(
    '/customers',
    async ({ query, store, posthog }) => {
      try {
        const customers = await PartiesService.getCustomers(store.tenantId, {
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          search: query.search,
          gstin: query.gstin
        })

        posthog?.track('customers.listed', {
          totalCustomers: customers.pagination.total,
          filters: {
            search: !!query.search,
            gstin: !!query.gstin
          }
        })

        return {
          success: true,
          data: customers
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch customers'
        }
      }
    },
    {
      beforeHandle: requirePermission('customer', 'read'),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        gstin: t.Optional(t.String())
      })
    }
  )

  // Get suppliers only
  .get(
    '/suppliers',
    async ({ query, store, posthog }) => {
      try {
        const suppliers = await PartiesService.getSuppliers(store.tenantId, {
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined,
          search: query.search,
          gstin: query.gstin
        })

        posthog?.track('suppliers.listed', {
          totalSuppliers: suppliers.pagination.total,
          filters: {
            search: !!query.search,
            gstin: !!query.gstin
          }
        })

        return {
          success: true,
          data: suppliers
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch suppliers'
        }
      }
    },
    {
      beforeHandle: requirePermission('supplier', 'read'),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
        gstin: t.Optional(t.String())
      })
    }
  )

  // Create new customer
  .post(
    '/customers',
    async ({ body, store, set, posthog }) => {
      try {
        const customer = await PartiesService.createCustomer(store.tenantId, body)

        posthog?.track('customer.created', {
          customerId: customer.id,
          hasEmail: !!customer.email,
          hasPhone: !!customer.phone,
          hasGstin: !!customer.gstin,
          hasCreditLimit: !!customer.creditLimit
        })

        set.status = 201
        return {
          success: true,
          message: 'Customer created successfully',
          data: customer
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message || 'Failed to create customer'
        }
      }
    },
    {
      beforeHandle: requirePermission('customer', 'create'),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        gstin: t.Optional(t.String()),
        pan: t.Optional(t.String()),
        address: t.Optional(t.Any()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String({ format: 'email' })),
        creditLimit: t.Optional(t.Number({ minimum: 0 }))
      })
    }
  )

  // Create new supplier
  .post(
    '/suppliers',
    async ({ body, store, set, posthog }) => {
      try {
        const supplier = await PartiesService.createSupplier(store.tenantId, body)

        posthog?.track('supplier.created', {
          supplierId: supplier.id,
          hasEmail: !!supplier.email,
          hasPhone: !!supplier.phone,
          hasGstin: !!supplier.gstin
        })

        set.status = 201
        return {
          success: true,
          message: 'Supplier created successfully',
          data: supplier
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message || 'Failed to create supplier'
        }
      }
    },
    {
      beforeHandle: requirePermission('supplier', 'create'),
      body: t.Object({
        name: t.String({ minLength: 1 }),
        gstin: t.Optional(t.String()),
        pan: t.Optional(t.String()),
        address: t.Optional(t.Any()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String({ format: 'email' }))
      })
    }
  )

  // Get specific party by ID
  .get(
    '/:id',
    async ({ params, store, set }) => {
      try {
        const party = await PartiesService.getPartyById(store.tenantId, params.id)

        if (!party) {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: 'Party not found'
          }
        }

        return {
          success: true,
          data: party
        }
      } catch (error: any) {
        set.status = 500
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to fetch party'
        }
      }
    },
    {
      beforeHandle: requireAnyPermission(['customer', 'supplier'], 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Update party
  .put(
    '/:id',
    async ({ params, body, store, set, posthog }) => {
      try {
        const updatedParty = await PartiesService.updateParty(store.tenantId, params.id, body)

        posthog?.track('party.updated', {
          partyId: params.id,
          partyType: updatedParty.type,
          fieldsUpdated: Object.keys(body)
        })

        return {
          success: true,
          message: 'Party updated successfully',
          data: updatedParty
        }
      } catch (error: any) {
        if (error.message === 'Party not found') {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: error.message
          }
        }

        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message || 'Failed to update party'
        }
      }
    },
    {
      beforeHandle: requireAnyPermission(['customer', 'supplier'], 'update'),
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        gstin: t.Optional(t.String()),
        pan: t.Optional(t.String()),
        address: t.Optional(t.Any()),
        phone: t.Optional(t.String()),
        email: t.Optional(t.String({ format: 'email' })),
        creditLimit: t.Optional(t.Number({ minimum: 0 }))
      })
    }
  )

  // Delete party
  .delete(
    '/:id',
    async ({ params, store, set, posthog }) => {
      try {
        const deleted = await PartiesService.deleteParty(store.tenantId, params.id)

        if (!deleted) {
          set.status = 404
          return {
            success: false,
            error: 'Not Found',
            message: 'Party not found'
          }
        }

        posthog?.track('party.deleted', {
          partyId: params.id
        })

        return {
          success: true,
          message: 'Party deleted successfully'
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'Bad Request',
          message: error.message || 'Failed to delete party'
        }
      }
    },
    {
      beforeHandle: requireAnyPermission(['customer', 'supplier'], 'delete'),
      params: t.Object({
        id: t.String()
      })
    }
  )