import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Heimdall Authentication Integration
 *
 * These tests verify the complete authentication flow:
 * - User registration
 * - User login
 * - Authenticated requests
 * - Token refresh
 * - Logout
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'
const HEIMDALL_URL = process.env.HEIMDALL_URL || 'http://localhost:8080'

// Test data
const generateTestUser = () => ({
  email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  password: 'TestPassword123!',
  fullName: 'Test User',
  tenantName: `Test Tenant ${Date.now()}`,
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F'
})

test.describe('Heimdall Authentication E2E', () => {

  test.beforeAll(async ({ request }) => {
    // Verify Heimdall server is running
    const heimdallHealth = await request.get(`${HEIMDALL_URL}/health`)
    expect(heimdallHealth.ok()).toBeTruthy()
  })

  test('should verify API health with Heimdall auth provider', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`)

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toMatchObject({
      status: 'healthy',
      authProvider: 'heimdall'
    })
    expect(data).toHaveProperty('heimdallUrl', HEIMDALL_URL)
    expect(data).toHaveProperty('timestamp')
  })

  test('should register a new user successfully', async ({ request }) => {
    const testUser = generateTestUser()

    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Verify response structure
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message', 'Registration successful')
    expect(data).toHaveProperty('data')

    // Verify user data
    expect(data.data.user).toMatchObject({
      email: testUser.email,
      fullName: testUser.fullName
    })
    expect(data.data.user).toHaveProperty('id')

    // Verify tenant data
    expect(data.data.tenant).toMatchObject({
      name: testUser.tenantName,
      gstin: testUser.gstin
    })
    expect(data.data.tenant).toHaveProperty('id')

    // Verify tokens
    expect(data.data).toHaveProperty('accessToken')
    expect(data.data).toHaveProperty('refreshToken')
    expect(data.data).toHaveProperty('tokenType', 'Bearer')

    // Verify tokens are valid JWT format
    expect(data.data.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
    expect(data.data.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })

  test('should fail registration with duplicate email', async ({ request }) => {
    const testUser = generateTestUser()

    // Register first time
    const firstResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })
    expect(firstResponse.ok()).toBeTruthy()

    // Try to register again with same email
    const secondResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    expect(secondResponse.status()).toBe(400)

    const data = await secondResponse.json()
    expect(data).toHaveProperty('success', false)
    expect(data).toHaveProperty('error')
  })

  test('should login successfully with valid credentials', async ({ request }) => {
    // First register a user
    const testUser = generateTestUser()
    await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    // Now login
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    })

    expect(loginResponse.ok()).toBeTruthy()

    const data = await loginResponse.json()

    // Verify response structure
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('message', 'Login successful')
    expect(data).toHaveProperty('data')

    // Verify tokens
    expect(data.data).toHaveProperty('accessToken')
    expect(data.data).toHaveProperty('refreshToken')
    expect(data.data).toHaveProperty('tokenType', 'Bearer')

    // Verify user data
    expect(data.data.user).toMatchObject({
      email: testUser.email,
      fullName: testUser.fullName
    })
    expect(data.data.user).toHaveProperty('role')

    // Verify tenant data
    expect(data.data.tenant).toMatchObject({
      name: testUser.tenantName
    })

    // Verify permissions
    expect(data.data).toHaveProperty('permissions')
    expect(Array.isArray(data.data.permissions)).toBeTruthy()
  })

  test('should fail login with invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      }
    })

    expect(response.status()).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('success', false)
    expect(data).toHaveProperty('error')
  })

  test('should access authenticated endpoints with valid token', async ({ request }) => {
    // Register and login
    const testUser = generateTestUser()
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    const registerData = await registerResponse.json()
    const accessToken = registerData.data.accessToken

    // Access profile endpoint
    const profileResponse = await request.get(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    expect(profileResponse.ok()).toBeTruthy()

    const profileData = await profileResponse.json()

    expect(profileData).toHaveProperty('success', true)
    expect(profileData).toHaveProperty('data')

    // Verify profile data
    expect(profileData.data.user).toMatchObject({
      email: testUser.email,
      fullName: testUser.fullName
    })
    expect(profileData.data.tenant).toMatchObject({
      name: testUser.tenantName
    })
    expect(profileData.data).toHaveProperty('permissions')
  })

  test('should fail to access authenticated endpoints without token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/auth/profile`)

    expect(response.status()).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error')
    expect(data).toHaveProperty('message')
  })

  test('should fail to access authenticated endpoints with invalid token', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': 'Bearer invalid.token.here'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should refresh access token successfully', async ({ request }) => {
    // Register to get tokens
    const testUser = generateTestUser()
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    const registerData = await registerResponse.json()
    const refreshToken = registerData.data.refreshToken

    // Refresh the token
    const refreshResponse = await request.post(`${API_URL}/api/auth/refresh`, {
      data: {
        refreshToken
      }
    })

    expect(refreshResponse.ok()).toBeTruthy()

    const refreshData = await refreshResponse.json()

    expect(refreshData).toHaveProperty('success', true)
    expect(refreshData).toHaveProperty('data')
    expect(refreshData.data).toHaveProperty('accessToken')
    expect(refreshData.data).toHaveProperty('refreshToken')
    expect(refreshData.data).toHaveProperty('tokenType', 'Bearer')

    // New tokens should be different from original
    expect(refreshData.data.accessToken).not.toBe(registerData.data.accessToken)
  })

  test('should fail to refresh with invalid refresh token', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/refresh`, {
      data: {
        refreshToken: 'invalid.refresh.token'
      }
    })

    expect(response.status()).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('success', false)
  })

  test('should logout successfully', async ({ request }) => {
    // Register and get token
    const testUser = generateTestUser()
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    const registerData = await registerResponse.json()
    const accessToken = registerData.data.accessToken

    // Logout
    const logoutResponse = await request.post(`${API_URL}/api/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    expect(logoutResponse.ok()).toBeTruthy()

    const logoutData = await logoutResponse.json()
    expect(logoutData).toHaveProperty('success', true)
    expect(logoutData).toHaveProperty('message', 'Logged out successfully')
  })

  test('should complete full authentication flow', async ({ request }) => {
    const testUser = generateTestUser()

    // Step 1: Register
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })
    expect(registerResponse.ok()).toBeTruthy()
    const registerData = await registerResponse.json()
    const initialAccessToken = registerData.data.accessToken

    // Step 2: Access authenticated endpoint
    const profile1Response = await request.get(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${initialAccessToken}`
      }
    })
    expect(profile1Response.ok()).toBeTruthy()

    // Step 3: Logout
    const logoutResponse = await request.post(`${API_URL}/api/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${initialAccessToken}`
      }
    })
    expect(logoutResponse.ok()).toBeTruthy()

    // Step 4: Login again
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    })
    expect(loginResponse.ok()).toBeTruthy()
    const loginData = await loginResponse.json()
    const newAccessToken = loginData.data.accessToken

    // Step 5: Access authenticated endpoint with new token
    const profile2Response = await request.get(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`
      }
    })
    expect(profile2Response.ok()).toBeTruthy()

    const profile2Data = await profile2Response.json()
    expect(profile2Data.data.user.email).toBe(testUser.email)
  })

  test('should validate JWT token format and structure', async ({ request }) => {
    const testUser = generateTestUser()
    const response = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    const data = await response.json()
    const accessToken = data.data.accessToken

    // Verify JWT structure (header.payload.signature)
    const parts = accessToken.split('.')
    expect(parts).toHaveLength(3)

    // Decode and verify payload structure
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    expect(payload).toHaveProperty('exp') // Expiration
    expect(payload).toHaveProperty('iat') // Issued at
  })

  test('should handle concurrent authentication requests', async ({ request }) => {
    // Create multiple users concurrently
    const users = Array.from({ length: 3 }, () => generateTestUser())

    const registerPromises = users.map(user =>
      request.post(`${API_URL}/api/auth/register`, { data: user })
    )

    const responses = await Promise.all(registerPromises)

    // All should succeed
    responses.forEach(response => {
      expect(response.ok()).toBeTruthy()
    })

    // Each should have unique tokens
    const tokens = await Promise.all(responses.map(r => r.json()))
    const accessTokens = tokens.map(t => t.data.accessToken)
    const uniqueTokens = new Set(accessTokens)

    expect(uniqueTokens.size).toBe(users.length)
  })

  test('should validate required fields in registration', async ({ request }) => {
    // Missing email
    const response1 = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        password: 'Test123!',
        fullName: 'Test User',
        tenantName: 'Test Tenant'
      }
    })
    expect(response1.status()).toBe(400)

    // Missing password
    const response2 = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        fullName: 'Test User',
        tenantName: 'Test Tenant'
      }
    })
    expect(response2.status()).toBe(400)

    // Missing fullName
    const response3 = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'Test123!',
        tenantName: 'Test Tenant'
      }
    })
    expect(response3.status()).toBe(400)

    // Missing tenantName
    const response4 = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'Test123!',
        fullName: 'Test User'
      }
    })
    expect(response4.status()).toBe(400)
  })

  test('should create proper tenant and user associations', async ({ request }) => {
    const testUser = generateTestUser()

    // Register
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: testUser
    })

    const registerData = await registerResponse.json()
    const accessToken = registerData.data.accessToken

    // Get profile
    const profileResponse = await request.get(`${API_URL}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const profileData = await profileResponse.json()

    // Verify user is associated with the correct tenant
    expect(profileData.data.tenant.name).toBe(testUser.tenantName)

    // Verify user has owner role (default for registration)
    expect(profileData.data.user.role).toBe('owner')

    // Verify user has permissions
    expect(profileData.data.permissions.length).toBeGreaterThan(0)
  })
})
