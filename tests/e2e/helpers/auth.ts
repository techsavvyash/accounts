import { APIRequestContext } from '@playwright/test'

/**
 * Helper utilities for authentication tests
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'

export interface TestUser {
  email: string
  password: string
  fullName: string
  tenantName: string
  gstin?: string
  pan?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: {
      id: string
      email: string
      fullName: string
      role?: string
    }
    tenant: {
      id: string
      name: string
      gstin?: string
    }
    accessToken: string
    refreshToken: string
    tokenType: string
    permissions?: Array<{
      action: string
      resource: string
    }>
  }
}

/**
 * Generate a unique test user
 */
export function generateTestUser(overrides?: Partial<TestUser>): TestUser {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)

  return {
    email: `test-${timestamp}-${random}@example.com`,
    password: 'TestPassword123!',
    fullName: 'Test User',
    tenantName: `Test Tenant ${timestamp}`,
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    ...overrides
  }
}

/**
 * Register a new user and return the tokens
 */
export async function registerUser(
  request: APIRequestContext,
  user: TestUser
): Promise<AuthResponse> {
  const response = await request.post(`${API_URL}/api/auth/register`, {
    data: user
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Registration failed: ${error}`)
  }

  return await response.json()
}

/**
 * Login a user and return the tokens
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Login failed: ${error}`)
  }

  return await response.json()
}

/**
 * Get user profile with authentication
 */
export async function getUserProfile(
  request: APIRequestContext,
  accessToken: string
) {
  const response = await request.get(`${API_URL}/api/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Get profile failed: ${error}`)
  }

  return await response.json()
}

/**
 * Logout a user
 */
export async function logoutUser(
  request: APIRequestContext,
  accessToken: string
): Promise<void> {
  const response = await request.post(`${API_URL}/api/auth/logout`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Logout failed: ${error}`)
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  request: APIRequestContext,
  refreshToken: string
): Promise<AuthTokens> {
  const response = await request.post(`${API_URL}/api/auth/refresh`, {
    data: { refreshToken }
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken
  }
}

/**
 * Create an authenticated request context
 */
export function createAuthHeaders(accessToken: string) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Verify JWT token format
 */
export function isValidJWT(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3
}

/**
 * Decode JWT payload (without verification)
 */
export function decodeJWT(token: string): any {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const payload = Buffer.from(parts[1], 'base64').toString()
  return JSON.parse(payload)
}
