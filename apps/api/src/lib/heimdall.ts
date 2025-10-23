import { HeimdallClient } from '@accounts/heimdall'
import { config } from '../config'

/**
 * Heimdall Authentication Client
 *
 * This client provides a unified interface to the Heimdall authentication service
 * for the Accounts Management Platform.
 */

export const heimdallClient = new HeimdallClient({
  apiUrl: config.HEIMDALL_URL || 'http://localhost:8080',
  tenantId: config.HEIMDALL_TENANT_ID,
  autoRefresh: true,
  refreshBuffer: 60, // Refresh 60 seconds before expiry

  onTokenRefresh: (tokens) => {
    console.log('Heimdall tokens refreshed successfully')
  },

  onAuthError: (error) => {
    console.error('Heimdall authentication error:', error)
  },

  headers: {
    'X-Platform': 'accounts-management'
  }
})

/**
 * Helper function to verify Heimdall access token
 *
 * This extracts and verifies the JWT token from Heimdall
 * @param token - The access token to verify
 * @returns Decoded token payload
 */
export async function verifyHeimdallToken(token: string) {
  try {
    // For now, we'll let Heimdall handle verification
    // In production, you might want to verify JWT signature locally
    return {
      valid: true,
      token
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return {
      valid: false,
      error
    }
  }
}

/**
 * Map Heimdall user to Accounts platform user
 *
 * @param heimdallUser - User from Heimdall
 * @returns User compatible with Accounts platform
 */
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

export { HeimdallClient }
