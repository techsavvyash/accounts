/**
 * E-Way Bill Authentication Module
 * Handles authentication with the E-Way Bill API
 */

import {
  EWayBillConfig,
  AuthResponse,
  AuthenticationError,
  EWayBillAPIResponse
} from './types'

export class EWayBillAuth {
  private authToken: string | null = null
  private sek: string | null = null // Session Encryption Key
  private tokenExpiry: number = 0
  private config: EWayBillConfig

  constructor(config: EWayBillConfig) {
    this.config = {
      baseURL: 'https://api.ewaybillgst.gov.in',
      apiVersion: 'v1.03',
      timeout: 30000,
      debug: false,
      ...config
    }
  }

  /**
   * Get current auth token (if valid)
   */
  getAuthToken(): string | null {
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken
    }
    return null
  }

  /**
   * Get Session Encryption Key
   */
  getSEK(): string | null {
    return this.sek
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && Date.now() < this.tokenExpiry
  }

  /**
   * Authenticate with E-Way Bill API
   * Token expires after 360 minutes (6 hours)
   */
  async authenticate(): Promise<AuthResponse> {
    const url = `${this.config.baseURL}/${this.config.apiVersion}/authenticate`

    const requestBody = {
      username: this.config.username,
      password: this.config.password
    }

    if (this.config.debug) {
      console.log('[EWayBill Auth] Authenticating...', {
        url,
        username: this.config.username
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'gstin': this.config.gstin,
          'username': this.config.username,
          'password': this.config.password,
          'requestid': this.generateRequestId(),
          ...(this.config.clientId && { 'client_id': this.config.clientId }),
          ...(this.config.clientSecret && { 'client_secret': this.config.clientSecret })
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new AuthenticationError(
          `Authentication failed with status ${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
      }

      const data: EWayBillAPIResponse<AuthResponse> = await response.json()

      if (data.status === '0' || data.errorCodes) {
        throw new AuthenticationError(
          data.error?.message || 'Authentication failed',
          { errorCodes: data.errorCodes, error: data.error }
        )
      }

      if (data.status === '1' && data.data) {
        this.authToken = data.data.authtoken
        this.sek = data.data.sek
        // Token expires after 360 minutes (6 hours)
        this.tokenExpiry = Date.now() + 360 * 60 * 1000

        if (this.config.debug) {
          console.log('[EWayBill Auth] Authentication successful', {
            tokenExpiry: new Date(this.tokenExpiry).toISOString()
          })
        }

        return {
          ...data.data,
          tokenExpiry: this.tokenExpiry
        }
      }

      throw new AuthenticationError('Invalid authentication response')
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AuthenticationError('Authentication request timeout')
        }
        throw new AuthenticationError(`Authentication failed: ${error.message}`)
      }

      throw new AuthenticationError('Authentication failed with unknown error')
    }
  }

  /**
   * Ensure we have a valid authentication token
   * Automatically re-authenticates if needed
   */
  async ensureAuthenticated(): Promise<void> {
    if (this.isAuthenticated()) {
      return
    }

    await this.authenticate()
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    this.authToken = null
    this.sek = null
    this.tokenExpiry = 0

    if (this.config.debug) {
      console.log('[EWayBill Auth] Authentication cleared')
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.authToken) {
      throw new AuthenticationError('Not authenticated. Call authenticate() first.')
    }

    return {
      'Content-Type': 'application/json',
      'gstin': this.config.gstin,
      'authtoken': this.authToken,
      ...(this.config.clientId && { 'client_id': this.config.clientId }),
      ...(this.config.clientSecret && { 'client_secret': this.config.clientSecret })
    }
  }
}
