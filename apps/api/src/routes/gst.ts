import { Elysia, t } from 'elysia'
import { GSTService } from '../services/gst'
import { requirePermission } from '../middleware/auth'

export const gstRoutes = new Elysia({ prefix: '/gst' })
  // Calculate GST for given parameters
  .post(
    '/calculate',
    async ({ body, posthog }) => {
      try {
        const calculation = GSTService.calculateGST(
          body.amount,
          body.gstRate,
          body.supplierState,
          body.customerState,
          {
            isInclusive: body.isInclusive,
            cessRate: body.cessRate,
            applyReverseCharge: body.applyReverseCharge
          }
        )

        posthog?.track('gst.calculation_performed', {
          amount: body.amount,
          gstRate: body.gstRate,
          isInterState: calculation.isInterState,
          totalTax: calculation.totalTax
        })

        return {
          success: true,
          data: calculation
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Calculation Error',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('gst_calculation', 'create'),
      body: t.Object({
        amount: t.Number({ minimum: 0.01 }),
        gstRate: t.Number({ minimum: 0, maximum: 50 }),
        supplierState: t.String({ length: 2 }),
        customerState: t.String({ length: 2 }),
        isInclusive: t.Optional(t.Boolean()),
        cessRate: t.Optional(t.Number({ minimum: 0 })),
        applyReverseCharge: t.Optional(t.Boolean())
      })
    }
  )

  // Validate GSTIN
  .post(
    '/validate-gstin',
    async ({ body, posthog }) => {
      try {
        const validation = GSTService.validateGSTIN(body.gstin)

        posthog?.track('gst.gstin_validated', {
          isValid: validation.isValid,
          stateCode: validation.isValid ? validation.info?.stateCode : null
        })

        return {
          success: true,
          data: validation
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Validation Error',
          message: error.message
        }
      }
    },
    {
      body: t.Object({
        gstin: t.String({ length: 15 })
      })
    }
  )

  // Get GST rate for HSN/SAC code
  .get(
    '/rate/:hsnSac',
    async ({ params, query }) => {
      try {
        const rate = GSTService.getGSTRate(
          params.hsnSac,
          query.amount ? parseFloat(query.amount) : undefined
        )

        return {
          success: true,
          data: {
            hsnSac: params.hsnSac,
            applicableRate: rate
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Rate Lookup Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        hsnSac: t.String({ minLength: 2, maxLength: 8 })
      }),
      query: t.Object({
        amount: t.Optional(t.String())
      })
    }
  )

  // Generate GSTR-1 return
  .post(
    '/returns/gstr1',
    async ({ body, store, set, posthog }) => {
      try {
        const result = await GSTService.generateGSTR1(
          store.tenantId,
          store.userId,
          body.period
        )

        posthog?.track('gst.gstr1_generated', {
          period: body.period,
          isValid: result.validation.isValid,
          errorCount: result.validation.errors.length
        })

        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'GSTR-1 Generation Error',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('gst_return', 'generate'),
      body: t.Object({
        period: t.String({ pattern: '^(0[1-9]|1[0-2])-\\d{4}$' })
      })
    }
  )

  // Generate GSTR-3B return
  .post(
    '/returns/gstr3b',
    async ({ body, store, set, posthog }) => {
      try {
        const result = await GSTService.generateGSTR3B(
          store.tenantId,
          store.userId,
          body.period
        )

        posthog?.track('gst.gstr3b_generated', {
          period: body.period,
          isValid: result.validation.isValid,
          errorCount: result.validation.errors.length
        })

        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'GSTR-3B Generation Error',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('gst_return', 'generate'),
      body: t.Object({
        period: t.String({ pattern: '^(0[1-9]|1[0-2])-\\d{4}$' })
      })
    }
  )

  // Get available GST rates
  .get(
    '/rates',
    () => {
      try {
        const rates = GSTService.getGSTRates()

        return {
          success: true,
          data: {
            standardRates: rates,
            description: {
              [rates.EXEMPT]: 'Exempt goods and essential services',
              [rates.GST_5]: 'Essential items, processed food, textiles',
              [rates.GST_12]: 'Industrial inputs, certain manufactured goods',
              [rates.GST_18]: 'Most goods and services (standard rate)',
              [rates.GST_28]: 'Luxury items, automobiles, tobacco products'
            }
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Rate Retrieval Error',
          message: error.message
        }
      }
    }
  )