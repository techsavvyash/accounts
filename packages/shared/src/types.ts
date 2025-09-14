// Common types for the accounts platform

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface User {
  id: string
  email: string
  fullName?: string
  isActive: boolean
  createdAt: string
}

export interface Tenant {
  id: string
  name: string
  gstin?: string
  pan?: string
  createdAt: string
}

export interface JwtPayload {
  userId: string
  tenantId: string
  roleId: string
  iat: number
  exp: number
}