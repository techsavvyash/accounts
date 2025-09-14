import { describe, it, expect } from 'bun:test'
import { testApp, testData, cleanupDatabase } from '../setup'

describe('Authentication End-to-End Tests', () => {
  it('should complete full user registration flow', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password,
          fullName: testData.user.fullName,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    expect(response.status).toBe(201)
    
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data.user).toBeDefined()
    expect(result.data.user.email).toBe(testData.user.email)
    expect(result.data.tenant).toBeDefined()
    expect(result.data.tenant.name).toBe(testData.tenant.name)
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
    
    // Verify tenant admin role was assigned
    expect(result.data.user.role).toBe('ADMIN')
  })
  
  it('should login with correct credentials', async () => {
    // First register a user
    await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password,
          fullName: testData.user.fullName,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    // Then login
    const loginResponse = await testApp.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password
        })
      })
    )
    
    expect(loginResponse.status).toBe(200)
    
    const result = await loginResponse.json()
    expect(result.success).toBe(true)
    expect(result.data.user.email).toBe(testData.user.email)
    expect(result.data.accessToken).toBeDefined()
  })
  
  it('should reject login with wrong password', async () => {
    // First register a user
    await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password,
          fullName: testData.user.fullName,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    // Try to login with wrong password
    const loginResponse = await testApp.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: 'WrongPassword123!'
        })
      })
    )
    
    expect(loginResponse.status).toBe(401)
    
    const result = await loginResponse.json()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid credentials')
  })
  
  it('should protect routes with authentication', async () => {
    const response = await testApp.handle(
      new Request('http://localhost:3000/api/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
    )
    
    expect(response.status).toBe(401)
  })
  
  it('should allow access with valid token', async () => {
    // Register and get token
    const authResponse = await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password,
          fullName: testData.user.fullName,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    const authResult = await authResponse.json()
    const token = authResult.data.accessToken
    
    // Access protected route
    const response = await testApp.handle(
      new Request('http://localhost:3000/api/products', {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      })
    )
    
    expect(response.status).toBe(200)
  })
  
  it('should refresh token successfully', async () => {
    // Register and get tokens
    const authResponse = await testApp.handle(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testData.user.email,
          password: testData.user.password,
          fullName: testData.user.fullName,
          tenantName: testData.tenant.name,
          gstin: testData.tenant.gstin
        })
      })
    )
    
    const authResult = await authResponse.json()
    const refreshToken = authResult.data.refreshToken
    
    // Refresh token
    const refreshResponse = await testApp.handle(
      new Request('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken
        })
      })
    )
    
    expect(refreshResponse.status).toBe(200)
    
    const result = await refreshResponse.json()
    expect(result.success).toBe(true)
    expect(result.data.accessToken).toBeDefined()
    expect(result.data.refreshToken).toBeDefined()
  })
})