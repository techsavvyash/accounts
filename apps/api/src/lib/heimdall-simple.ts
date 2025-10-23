import { HeimdallClient } from '@techsavvyash/heimdall-sdk'
import { config } from '../config'

/**
 * Heimdall SDK Client
 * Official SDK for authentication with Heimdall service
 */

// Initialize Heimdall client with server-side storage
const heimdallClient = new HeimdallClient({
  apiUrl: config.HEIMDALL_URL || 'http://localhost:8080',
  tenantId: config.HEIMDALL_TENANT_ID,
  // Server-side storage using in-memory Map
  storage: {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.get(key) || null
    },
    setItem(key: string, value: string) {
      this.store.set(key, value)
    },
    removeItem(key: string) {
      this.store.delete(key)
    }
  },
  autoRefresh: false, // Server-side doesn't need auto-refresh
})

// Wrapper to maintain existing API interface
export const heimdallAuth = {
  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
    tenantId?: string
  }) {
    try {
      console.log('[Heimdall SDK] Registering user:', { email: data.email, firstName: data.firstName, lastName: data.lastName })

      const user = await heimdallClient.auth.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })

      console.log('[Heimdall SDK] User registered successfully:', user)

      const accessToken = await heimdallClient.auth.getAccessToken()

      console.log('[Heimdall SDK] Got access token')

      return {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken: '' // SDK doesn't provide refresh token after register
        }
      }
    } catch (error: any) {
      console.error('[Heimdall SDK] Registration error:', error)
      return {
        success: false,
        error: {
          code: error.code || 'REGISTRATION_FAILED',
          message: error.message || 'Failed to register user with Heimdall'
        }
      }
    }
  },

  async login(data: {
    email: string
    password: string
    rememberMe?: boolean
  }) {
    try {
      const user = await heimdallClient.auth.login({
        email: data.email,
        password: data.password,
      })

      const accessToken = await heimdallClient.auth.getAccessToken()

      return {
        success: true,
        data: {
          user,
          accessToken,
          refreshToken: '' // SDK doesn't provide separate refresh token getter
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'LOGIN_FAILED',
          message: error.message || 'Failed to login with Heimdall'
        }
      }
    }
  },

  async logout(token: string) {
    await heimdallClient.auth.logout()
    return {
      success: true,
      message: 'Logged out successfully'
    }
  },

  async refresh(refreshToken: string) {
    // Set the refresh token before calling refresh
    await heimdallClient.auth.setRefreshToken(refreshToken)
    const tokens = await heimdallClient.auth.refreshToken()

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    }
  },

  async verify(token: string) {
    try {
      // Decode JWT token to extract user information
      // JWT format: header.payload.signature
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      // Decode the payload (base64url)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('Token expired')
      }

      // Extract user information from payload
      const user = {
        id: payload.sub || payload.userId || payload.id,
        email: payload.email,
        firstName: payload.firstName || payload.given_name,
        lastName: payload.lastName || payload.family_name,
        tenantId: payload.tenantId,
        metadata: payload.metadata
      }

      return {
        success: true,
        data: { user }
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.code || 'VERIFICATION_FAILED',
          message: error.message || 'Failed to verify token'
        }
      }
    }
  }
}

// Export client for direct access if needed
export { heimdallClient }

export function mapHeimdallUser(heimdallUser: any) {
  return {
    id: heimdallUser.id,
    email: heimdallUser.email,
    fullName: `${heimdallUser.firstName || ''} ${heimdallUser.lastName || ''}`.trim(),
    firstName: heimdallUser.firstName,
    lastName: heimdallUser.lastName,
    tenantId: heimdallUser.tenantId,
    metadata: heimdallUser.metadata,
    roles: heimdallUser.roles || [],
    createdAt: heimdallUser.createdAt,
    isActive: true
  }
}
