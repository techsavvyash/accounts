import { Elysia, t } from 'elysia'
import { prisma } from '@accounts/database'
import { InvoiceService } from '../services/invoice'
import { requirePermission } from '../middleware/auth'

export const invoiceRoutes = new Elysia({ prefix: '/invoices' })
  .get(
    '/',
    async ({ query, store, posthog }) => {
      try {
        const invoices = await InvoiceService.getInvoices(store.tenantId, {
          status: query.status,
          customerId: query.customerId,
          fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
          toDate: query.toDate ? new Date(query.toDate) : undefined,
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined
        })

        posthog?.track('invoices.listed', {
          totalCount: invoices.pagination.total,
          filters: {
            status: query.status,
            customerId: query.customerId,
            hasDateRange: !!(query.fromDate || query.toDate)
          }
        })

        return {
          success: true,
          data: invoices
        }
      } catch (error: any) {
        return {
          error: 'Internal Server Error',
          message: 'Failed to fetch invoices'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'read'),
      query: t.Object({
        status: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        fromDate: t.Optional(t.String({ format: 'date' })),
        toDate: t.Optional(t.String({ format: 'date' })),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )
  .post(
    '/check-stock',
    async ({ body, store, set }) => {
      try {
        const stockCheck = await InvoiceService.checkStockAvailability(
          store.tenantId,
          body.lineItems
        )

        return {
          success: true,
          data: stockCheck
        }
      } catch (error: any) {
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to check stock availability'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'read'),
      body: t.Object({
        lineItems: t.Array(
          t.Object({
            inventoryItemId: t.Optional(t.String()),
            description: t.String({ minLength: 1 }),
            quantity: t.Number({ minimum: 0.001 }),
            unitPrice: t.Number({ minimum: 0.01 })
          }),
          { minItems: 1 }
        )
      })
    }
  )
  .post(
    '/',
    async ({ body, store, set, posthog }) => {
      try {
        const invoice = await InvoiceService.createInvoice(
          store.tenantId,
          store.userId,
          {
            customerId: body.customerId,
            invoiceDate: new Date(body.invoiceDate),
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            lineItems: body.lineItems,
            notes: body.notes
          }
        )

        posthog?.track('invoice.created', {
          invoiceId: invoice.id,
          totalAmount: invoice.totalAmount,
          lineItemsCount: body.lineItems.length
        })

        return {
          success: true,
          message: 'Invoice created successfully',
          data: invoice
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'create'),
      body: t.Object({
        customerId: t.String(),
        invoiceDate: t.String({ format: 'date' }),
        dueDate: t.Optional(t.String({ format: 'date' })),
        lineItems: t.Array(
          t.Object({
            inventoryItemId: t.Optional(t.String()),
            description: t.String({ minLength: 1 }),
            quantity: t.Number({ minimum: 0.001 }),
            unitPrice: t.Number({ minimum: 0.01 }),
            taxRateId: t.Optional(t.String())
          }),
          { minItems: 1 }
        ),
        notes: t.Optional(t.String())
      })
    }
  )
  .get(
    '/:id',
    async ({ params, store, set }) => {
      try {
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: params.id,
            tenantId: store.tenantId
          },
          include: {
            customer: true,
            lineItems: {
              include: {
                inventoryItem: {
                  select: {
                    id: true,
                    name: true,
                    sku: true
                  }
                },
                taxRate: true
              }
            }
          }
        })

        if (!invoice) {
          set.status = 404
          return {
            error: 'Not Found',
            message: 'Invoice not found'
          }
        }

        return {
          success: true,
          data: invoice
        }
      } catch (error: any) {
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to fetch invoice'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )
  .post(
    '/:id/send',
    async ({ params, store, set, posthog }) => {
      try {
        const invoice = await InvoiceService.sendInvoice(
          store.tenantId,
          store.userId,
          params.id
        )

        posthog?.track('invoice.sent', {
          invoiceId: params.id,
          totalAmount: invoice.totalAmount,
          customerId: invoice.customerId
        })

        return {
          success: true,
          message: 'Invoice sent successfully',
          data: invoice
        }
      } catch (error: any) {
        if (error.message.includes('not found') || error.message.includes('not in DRAFT')) {
          set.status = 404
          return {
            error: 'Not Found',
            message: error.message
          }
        }

        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to send invoice'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'update'),
      params: t.Object({
        id: t.String()
      })
    }
  )
  .post(
    '/:id/void',
    async ({ params, body, store, set, posthog }) => {
      try {
        const invoice = await InvoiceService.voidInvoice(
          store.tenantId,
          store.userId,
          params.id,
          body?.reason
        )

        posthog?.track('invoice.voided', {
          invoiceId: params.id,
          reason: body?.reason,
          totalAmount: invoice.totalAmount
        })

        return {
          success: true,
          message: 'Invoice voided successfully',
          data: invoice
        }
      } catch (error: any) {
        if (error.message.includes('not found') || error.message.includes('cannot be voided')) {
          set.status = 404
          return {
            error: 'Not Found',
            message: error.message
          }
        }

        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to void invoice'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'void'),
      params: t.Object({
        id: t.String()
      }),
      body: t.Optional(t.Object({
        reason: t.Optional(t.String())
      }))
    }
  )
  .post(
    '/:id/payments',
    async ({ params, body, store, set, posthog }) => {
      try {
        const result = await InvoiceService.recordPayment(
          store.tenantId,
          store.userId,
          params.id,
          {
            amount: body.amount,
            paymentDate: new Date(body.paymentDate),
            paymentMethod: body.paymentMethod,
            referenceNo: body.referenceNo,
            notes: body.notes
          }
        )

        posthog?.track('invoice.payment_recorded', {
          invoiceId: params.id,
          paymentAmount: body.amount,
          paymentMethod: body.paymentMethod,
          newStatus: result.invoice.status
        })

        return {
          success: true,
          message: 'Payment recorded successfully',
          data: result
        }
      } catch (error: any) {
        if (error.message.includes('not found') || 
            error.message.includes('cannot be paid') ||
            error.message.includes('exceeds remaining')) {
          set.status = 400
          return {
            error: 'Bad Request',
            message: error.message
          }
        }

        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to record payment'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'update'),
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        amount: t.Number({ minimum: 0.01 }),
        paymentDate: t.String({ format: 'date' }),
        paymentMethod: t.String({ minLength: 1 }),
        referenceNo: t.Optional(t.String()),
        notes: t.Optional(t.String())
      })
    }
  )
  .get(
    '/:id/payments',
    async ({ params, store, set }) => {
      try {
        const payments = await prisma.payment.findMany({
          where: {
            invoiceId: params.id,
            invoice: {
              tenantId: store.tenantId
            }
          },
          orderBy: {
            paymentDate: 'desc'
          }
        })

        const totalPaid = payments.reduce((sum, payment) => 
          sum + payment.amount.toNumber(), 0
        )

        return {
          success: true,
          data: {
            payments,
            summary: {
              totalPaid,
              paymentCount: payments.length
            }
          }
        }
      } catch (error: any) {
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to fetch payments'
        }
      }
    },
    {
      beforeHandle: requirePermission('invoice', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )