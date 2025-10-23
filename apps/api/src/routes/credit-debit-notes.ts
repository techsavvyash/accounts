import { Elysia, t } from 'elysia'
import { CreditDebitNoteService } from '../services/credit-debit-notes'
import { requirePermission } from '../middleware/auth'

export const creditDebitNoteRoutes = new Elysia({ prefix: '/credit-debit-notes' })
  // Get all notes (credit and debit combined)
  .get(
    '/',
    async ({ query, store, posthog }) => {
      try {
        const result = await CreditDebitNoteService.getNotes(store.tenantId, {
          status: query.status,
          customerId: query.customerId,
          fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
          toDate: query.toDate ? new Date(query.toDate) : undefined,
          type: query.type as 'credit' | 'debit' | undefined,
          page: query.page ? parseInt(query.page) : undefined,
          limit: query.limit ? parseInt(query.limit) : undefined
        })

        posthog?.track('credit_debit_notes.listed', {
          totalCount: result.pagination.total,
          filters: {
            status: query.status,
            type: query.type,
            customerId: query.customerId
          }
        })

        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        return {
          error: 'Internal Server Error',
          message: error.message || 'Failed to fetch notes'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'read'),
      query: t.Object({
        status: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        fromDate: t.Optional(t.String({ format: 'date' })),
        toDate: t.Optional(t.String({ format: 'date' })),
        type: t.Optional(t.Union([t.Literal('credit'), t.Literal('debit')])),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  // Create Credit Note
  .post(
    '/credit',
    async ({ body, store, set, posthog }) => {
      try {
        const creditNote = await CreditDebitNoteService.createCreditNote(
          store.tenantId,
          store.userId,
          {
            customerId: body.customerId,
            originalInvoiceId: body.originalInvoiceId,
            issueDate: new Date(body.issueDate),
            reason: body.reason,
            notes: body.notes,
            lineItems: body.lineItems
          }
        )

        posthog?.track('credit_note.created', {
          creditNoteId: creditNote.id,
          totalAmount: creditNote.totalAmount,
          lineItemsCount: body.lineItems.length
        })

        return {
          success: true,
          message: 'Credit note created successfully',
          data: creditNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to create credit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'create'),
      body: t.Object({
        customerId: t.String(),
        originalInvoiceId: t.Optional(t.String()),
        issueDate: t.String({ format: 'date' }),
        reason: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        lineItems: t.Array(
          t.Object({
            inventoryItemId: t.Optional(t.String()),
            description: t.String({ minLength: 1 }),
            hsnCode: t.Optional(t.String()),
            quantity: t.Number({ minimum: 0.001 }),
            unitPrice: t.Number({ minimum: 0 }),
            taxRateId: t.Optional(t.String())
          }),
          { minItems: 1 }
        )
      })
    }
  )

  // Create Debit Note
  .post(
    '/debit',
    async ({ body, store, set, posthog }) => {
      try {
        const debitNote = await CreditDebitNoteService.createDebitNote(
          store.tenantId,
          store.userId,
          {
            customerId: body.customerId,
            originalInvoiceId: body.originalInvoiceId,
            issueDate: new Date(body.issueDate),
            reason: body.reason,
            notes: body.notes,
            lineItems: body.lineItems
          }
        )

        posthog?.track('debit_note.created', {
          debitNoteId: debitNote.id,
          totalAmount: debitNote.totalAmount,
          lineItemsCount: body.lineItems.length
        })

        return {
          success: true,
          message: 'Debit note created successfully',
          data: debitNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to create debit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'create'),
      body: t.Object({
        customerId: t.String(),
        originalInvoiceId: t.Optional(t.String()),
        issueDate: t.String({ format: 'date' }),
        reason: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        lineItems: t.Array(
          t.Object({
            inventoryItemId: t.Optional(t.String()),
            description: t.String({ minLength: 1 }),
            hsnCode: t.Optional(t.String()),
            quantity: t.Number({ minimum: 0.001 }),
            unitPrice: t.Number({ minimum: 0 }),
            taxRateId: t.Optional(t.String())
          }),
          { minItems: 1 }
        )
      })
    }
  )

  // Get single credit note
  .get(
    '/credit/:id',
    async ({ params, store, set }) => {
      try {
        const creditNote = await CreditDebitNoteService.getCreditNote(
          store.tenantId,
          params.id
        )

        return {
          success: true,
          data: creditNote
        }
      } catch (error: any) {
        set.status = 404
        return {
          error: 'Not Found',
          message: error.message || 'Credit note not found'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Get single debit note
  .get(
    '/debit/:id',
    async ({ params, store, set }) => {
      try {
        const debitNote = await CreditDebitNoteService.getDebitNote(
          store.tenantId,
          params.id
        )

        return {
          success: true,
          data: debitNote
        }
      } catch (error: any) {
        set.status = 404
        return {
          error: 'Not Found',
          message: error.message || 'Debit note not found'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'read'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Issue credit note
  .post(
    '/credit/:id/issue',
    async ({ params, store, set, posthog }) => {
      try {
        const creditNote = await CreditDebitNoteService.issueCreditNote(
          store.tenantId,
          params.id
        )

        posthog?.track('credit_note.issued', {
          creditNoteId: params.id,
          totalAmount: creditNote.totalAmount
        })

        return {
          success: true,
          message: 'Credit note issued successfully',
          data: creditNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to issue credit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'update'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Issue debit note
  .post(
    '/debit/:id/issue',
    async ({ params, store, set, posthog }) => {
      try {
        const debitNote = await CreditDebitNoteService.issueDebitNote(
          store.tenantId,
          params.id
        )

        posthog?.track('debit_note.issued', {
          debitNoteId: params.id,
          totalAmount: debitNote.totalAmount
        })

        return {
          success: true,
          message: 'Debit note issued successfully',
          data: debitNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to issue debit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'update'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Cancel credit note
  .post(
    '/credit/:id/cancel',
    async ({ params, store, set, posthog }) => {
      try {
        const creditNote = await CreditDebitNoteService.cancelCreditNote(
          store.tenantId,
          params.id
        )

        posthog?.track('credit_note.cancelled', {
          creditNoteId: params.id
        })

        return {
          success: true,
          message: 'Credit note cancelled successfully',
          data: creditNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to cancel credit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'delete'),
      params: t.Object({
        id: t.String()
      })
    }
  )

  // Cancel debit note
  .post(
    '/debit/:id/cancel',
    async ({ params, store, set, posthog }) => {
      try {
        const debitNote = await CreditDebitNoteService.cancelDebitNote(
          store.tenantId,
          params.id
        )

        posthog?.track('debit_note.cancelled', {
          debitNoteId: params.id
        })

        return {
          success: true,
          message: 'Debit note cancelled successfully',
          data: debitNote
        }
      } catch (error: any) {
        set.status = 400
        return {
          error: 'Bad Request',
          message: error.message || 'Failed to cancel debit note'
        }
      }
    },
    {
      beforeHandle: requirePermission('credit_note', 'delete'),
      params: t.Object({
        id: t.String()
      })
    }
  )
