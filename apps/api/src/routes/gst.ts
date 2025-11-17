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

  // ==================== HSN Registry Endpoints ====================

  // Get all HSN chapters
  .get(
    '/hsn/chapters',
    ({ posthog }) => {
      try {
        const chapters = GSTService.getHSNChapters()

        posthog?.track('gst.hsn_chapters_retrieved', {
          count: chapters.length
        })

        return {
          success: true,
          data: {
            chapters,
            count: chapters.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Chapters Retrieval Error',
          message: error.message
        }
      }
    }
  )

  // Get specific HSN chapter
  .get(
    '/hsn/chapters/:code',
    ({ params }) => {
      try {
        const chapter = GSTService.getHSNChapter(params.code)

        if (!chapter) {
          return {
            success: false,
            error: 'Chapter Not Found',
            message: `HSN chapter ${params.code} not found`
          }
        }

        return {
          success: true,
          data: chapter
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Chapter Retrieval Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        code: t.String({ minLength: 2, maxLength: 2 })
      })
    }
  )

  // Get HSN chapters by section
  .get(
    '/hsn/sections/:section',
    ({ params }) => {
      try {
        const chapters = GSTService.getHSNChaptersBySection(params.section)

        return {
          success: true,
          data: {
            section: params.section,
            chapters,
            count: chapters.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Section Retrieval Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        section: t.String()
      })
    }
  )

  // Search HSN codes
  .get(
    '/hsn/search',
    ({ query, posthog }) => {
      try {
        if (!query.q || query.q.trim().length < 2) {
          return {
            success: false,
            error: 'Invalid Query',
            message: 'Search query must be at least 2 characters'
          }
        }

        const results = GSTService.searchHSNCodes(query.q)

        posthog?.track('gst.hsn_search_performed', {
          query: query.q,
          resultCount: results.length
        })

        return {
          success: true,
          data: {
            query: query.q,
            results,
            count: results.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Search Error',
          message: error.message
        }
      }
    },
    {
      query: t.Object({
        q: t.String()
      })
    }
  )

  // Get HSN code details
  .get(
    '/hsn/:code',
    ({ params, posthog }) => {
      try {
        const details = GSTService.lookupHSN(params.code)

        posthog?.track('gst.hsn_lookup_performed', {
          code: params.code,
          isValid: details.isValid
        })

        return {
          success: true,
          data: details
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Lookup Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        code: t.String({ minLength: 2, maxLength: 8 })
      })
    }
  )

  // Get HSN codes by chapter
  .get(
    '/hsn/chapter/:chapter/codes',
    ({ params }) => {
      try {
        const codes = GSTService.getHSNCodesByChapter(params.chapter)

        return {
          success: true,
          data: {
            chapter: params.chapter,
            codes,
            count: codes.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Codes Retrieval Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        chapter: t.String({ minLength: 2, maxLength: 2 })
      })
    }
  )

  // Get HSN codes by GST rate
  .get(
    '/hsn/rate/:rate',
    ({ params }) => {
      try {
        const rate = parseInt(params.rate)
        const codes = GSTService.getHSNCodesByRate(rate)

        return {
          success: true,
          data: {
            gstRate: rate,
            codes,
            count: codes.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Rate Lookup Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        rate: t.String({ pattern: '^(0|5|12|18|28)$' })
      })
    }
  )

  // Get all registered HSN codes
  .get(
    '/hsn/codes',
    ({ posthog }) => {
      try {
        const codes = GSTService.getAllHSNCodes()

        posthog?.track('gst.all_hsn_codes_retrieved', {
          count: codes.length
        })

        return {
          success: true,
          data: {
            codes,
            count: codes.length
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Codes Retrieval Error',
          message: error.message
        }
      }
    }
  )

  // Get HSN registry statistics
  .get(
    '/hsn/stats',
    () => {
      try {
        const stats = GSTService.getHSNCount()

        return {
          success: true,
          data: stats
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Stats Retrieval Error',
          message: error.message
        }
      }
    }
  )

  // ==================== Portal Export Endpoints ====================

  // Export GSTR-1 for portal upload
  .post(
    '/returns/gstr1/export',
    async ({ body, store, set, posthog }) => {
      try {
        // First generate the return
        const result = await GSTService.generateGSTR1(
          store.tenantId,
          store.userId,
          body.period
        )

        // Then export for portal
        const exportResult = GSTService.exportGSTR1ForPortal(result.return, {
          pretty: body.pretty,
          validate: body.validate
        })

        posthog?.track('gst.gstr1_exported_for_portal', {
          period: body.period,
          fileSize: exportResult.size,
          isValid: exportResult.validation?.isValid
        })

        return {
          success: true,
          data: {
            ...exportResult,
            returnData: result
          }
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'GSTR-1 Export Error',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('gst_return', 'export'),
      body: t.Object({
        period: t.String({ pattern: '^(0[1-9]|1[0-2])-\\d{4}$' }),
        pretty: t.Optional(t.Boolean()),
        validate: t.Optional(t.Boolean())
      })
    }
  )

  // Export GSTR-3B for portal upload
  .post(
    '/returns/gstr3b/export',
    async ({ body, store, set, posthog }) => {
      try {
        // First generate the return
        const result = await GSTService.generateGSTR3B(
          store.tenantId,
          store.userId,
          body.period
        )

        // Then export for portal
        const exportResult = GSTService.exportGSTR3BForPortal(result.return, {
          pretty: body.pretty,
          validate: body.validate
        })

        posthog?.track('gst.gstr3b_exported_for_portal', {
          period: body.period,
          fileSize: exportResult.size,
          isValid: exportResult.validation?.isValid
        })

        return {
          success: true,
          data: {
            ...exportResult,
            returnData: result
          }
        }
      } catch (error: any) {
        set.status = 400
        return {
          success: false,
          error: 'GSTR-3B Export Error',
          message: error.message
        }
      }
    },
    {
      beforeHandle: requirePermission('gst_return', 'export'),
      body: t.Object({
        period: t.String({ pattern: '^(0[1-9]|1[0-2])-\\d{4}$' }),
        pretty: t.Optional(t.Boolean()),
        validate: t.Optional(t.Boolean())
      })
    }
  )

  // Get portal upload instructions
  .get(
    '/portal/instructions/:returnType',
    ({ params }) => {
      try {
        if (params.returnType !== 'GSTR-1' && params.returnType !== 'GSTR-3B') {
          return {
            success: false,
            error: 'Invalid Return Type',
            message: 'Return type must be either GSTR-1 or GSTR-3B'
          }
        }

        const instructions = GSTService.getPortalUploadInstructions(params.returnType)

        return {
          success: true,
          data: {
            returnType: params.returnType,
            instructions
          }
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'Instructions Retrieval Error',
          message: error.message
        }
      }
    },
    {
      params: t.Object({
        returnType: t.String()
      })
    }
  )

  // ==================== Additional Validation Endpoints ====================

  // Validate PAN
  .post(
    '/validate-pan',
    ({ body, posthog }) => {
      try {
        const validation = GSTService.validatePAN(body.pan)

        posthog?.track('gst.pan_validated', {
          isValid: validation.isValid
        })

        return {
          success: true,
          data: validation
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'PAN Validation Error',
          message: error.message
        }
      }
    },
    {
      body: t.Object({
        pan: t.String({ minLength: 10, maxLength: 10 })
      })
    }
  )

  // Validate HSN code
  .post(
    '/validate-hsn',
    ({ body, posthog }) => {
      try {
        const validation = GSTService.validateHSN(body.hsn)

        posthog?.track('gst.hsn_validated', {
          isValid: validation.isValid,
          code: body.hsn
        })

        return {
          success: true,
          data: validation
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'HSN Validation Error',
          message: error.message
        }
      }
    },
    {
      body: t.Object({
        hsn: t.String({ minLength: 2, maxLength: 8 })
      })
    }
  )

  // Validate SAC code
  .post(
    '/validate-sac',
    ({ body, posthog }) => {
      try {
        const validation = GSTService.validateSAC(body.sac)

        posthog?.track('gst.sac_validated', {
          isValid: validation.isValid,
          code: body.sac
        })

        return {
          success: true,
          data: validation
        }
      } catch (error: any) {
        return {
          success: false,
          error: 'SAC Validation Error',
          message: error.message
        }
      }
    },
    {
      body: t.Object({
        sac: t.String({ minLength: 6, maxLength: 6 })
      })
    }
  )