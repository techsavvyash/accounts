import { z } from 'zod'

// Common Zod schemas for validation

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional()
})

export const uuidSchema = z.string().uuid()

export const emailSchema = z.string().email()

export const phoneSchema = z.string().regex(/^[+]?[1-9][\d-\s()]{7,15}$/)

export const gstinSchema = z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)

export const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)

export const authSchema = {
  login: z.object({
    email: emailSchema,
    password: z.string().min(8)
  }),
  
  register: z.object({
    email: emailSchema,
    password: z.string().min(8),
    fullName: z.string().min(1),
    tenantName: z.string().min(1),
    gstin: gstinSchema.optional(),
    pan: panSchema.optional()
  })
}