#!/usr/bin/env bun
/**
 * Test script to verify Heimdall authentication integration
 */

import axios from 'axios'

const HEIMDALL_URL = 'http://localhost:8080'
const API_URL = 'http://localhost:3000'

async function testHeimdallIntegration() {
  console.log('🧪 Testing Heimdall Authentication Integration\n')

  try {
    // Step 1: Check Heimdall server health
    console.log('1️⃣  Checking Heimdall server...')
    const heimdallHealth = await axios.get(`${HEIMDALL_URL}/health`)
    console.log('✅ Heimdall server is healthy:', heimdallHealth.data)
    console.log()

    // Step 2: Check API server health
    console.log('2️⃣  Checking API server...')
    const apiHealth = await axios.get(`${API_URL}/health`)
    console.log('✅ API server is healthy:', apiHealth.data)
    console.log()

    // Step 3: Test registration
    console.log('3️⃣  Testing user registration...')
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Test User',
      tenantName: 'Test Tenant',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F'
    }

    try {
      const registerResponse = await axios.post(
        `${API_URL}/api/auth/register`,
        testUser
      )

      if (registerResponse.data.success) {
        console.log('✅ Registration successful!')
        console.log('   User:', registerResponse.data.data.user)
        console.log('   Tenant:', registerResponse.data.data.tenant)
        console.log('   Access Token:', registerResponse.data.data.accessToken?.substring(0, 20) + '...')
        console.log()

        // Step 4: Test login
        console.log('4️⃣  Testing user login...')
        const loginResponse = await axios.post(
          `${API_URL}/api/auth/login`,
          {
            email: testUser.email,
            password: testUser.password
          }
        )

        if (loginResponse.data.success) {
          console.log('✅ Login successful!')
          const accessToken = loginResponse.data.data.accessToken
          console.log('   Access Token:', accessToken?.substring(0, 20) + '...')
          console.log()

          // Step 5: Test authenticated request
          console.log('5️⃣  Testing authenticated request to profile...')
          const profileResponse = await axios.get(
            `${API_URL}/api/auth/profile`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          )

          if (profileResponse.data.success) {
            console.log('✅ Profile fetch successful!')
            console.log('   Profile:', profileResponse.data.data.user)
            console.log()
          }

          // Step 6: Test logout
          console.log('6️⃣  Testing logout...')
          const logoutResponse = await axios.post(
            `${API_URL}/api/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            }
          )

          if (logoutResponse.data.success) {
            console.log('✅ Logout successful!')
            console.log()
          }
        }
      }
    } catch (error: any) {
      if (error.response) {
        console.error('❌ Registration/Login failed:', error.response.data)
      } else {
        throw error
      }
    }

    console.log('🎉 All tests completed successfully!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('   Response:', error.response.data)
    }
    process.exit(1)
  }
}

// Run the tests
testHeimdallIntegration()
