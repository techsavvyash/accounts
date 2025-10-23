import { Elysia, t } from 'elysia'
import { prisma, db } from '@accounts/database'
import { heimdallAuth, mapHeimdallUser } from '../lib/heimdall-simple'
import { config } from '../config'

/**
 * Heimdall-based Authentication Routes
 *
 * These routes proxy authentication to the Heimdall service
 * while maintaining compatibility with the Accounts platform.
 */

export const heimdallAuthRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/register',
    async ({ body, set, posthog }) => {
      console.log('[REGISTER] Starting registration:', { email: body?.email, fullName: body?.fullName })
      try {
        const { email, password, fullName, tenantName, gstin, pan } = body

        // Split fullName properly - handle various formats
        const nameParts = fullName?.trim().split(/\s+/) || []
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Validate firstName is not empty (required by Heimdall)
        if (!firstName || firstName.length === 0) {
          set.status = 400
          return {
            success: false,
            error: 'INVALID_NAME',
            message: 'Full name must include at least a first name'
          }
        }

        // Register user with Heimdall (no metadata - not supported by API)
        const heimdallResponse = await heimdallAuth.register({
          email,
          password,
          firstName,
          lastName: lastName || firstName // Use firstName as fallback if no lastName
        })

        if (!heimdallResponse.success || !heimdallResponse.data) {
          throw new Error(heimdallResponse.error?.message || 'Registration failed')
        }

        const { user: heimdallUser, accessToken, refreshToken } = heimdallResponse.data

        // Create OUR tenant in local database (independent of Heimdall's tenant)
        const tenant = await db.createTenantWithDefaults({
          name: tenantName,
          gstin,
          pan
        })

        // Create user in local database
        const user = await prisma.user.create({
          data: {
            id: heimdallUser.id,
            email: heimdallUser.email,
            passwordHash: '', // Managed by Heimdall
            fullName: fullName || `${firstName} ${lastName}`.trim()
          }
        })

        // Get owner role
        const ownerRole = await prisma.role.findFirst({
          where: {
            name: 'owner',
            tenantId: null // System role
          }
        })

        if (!ownerRole) {
          throw new Error('Owner role not found. Please run database seed.')
        }

        // Associate user with tenant as owner
        await prisma.tenantUser.create({
          data: {
            userId: user.id,
            tenantId: tenant.id,
            roleId: ownerRole.id
          }
        })

        // Fetch user with complete relationships (including role and permissions)
        const userWithRelations = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            tenantUsers: {
              where: { tenantId: tenant.id },
              include: {
                tenant: true,
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

        const tenantUser = userWithRelations?.tenantUsers[0]

        // Track registration
        posthog?.track('user_registered', {
          userId: user.id,
          tenantId: tenant.id,
          tenantName,
          authProvider: 'heimdall'
        })

        set.status = 201
        return {
          success: true,
          message: 'Registration successful',
          data: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: tenantUser?.role.name || 'owner'
            },
            tenant: {
              id: tenant.id,
              name: tenant.name,
              gstin: tenant.gstin
            },
            permissions: tenantUser?.role.rolePermissions.map(rp => ({
              action: rp.permission.action,
              resource: rp.permission.resource
            })) || []
          }
        }

      } catch (error: any) {
        console.error('[REGISTER] Heimdall registration error:', error)
        console.error('[REGISTER] Error stack:', error.stack)
        set.status = error.statusCode || 500
        return {
          success: false,
          error: error.code || 'REGISTRATION_FAILED',
          message: error.message || 'Failed to create account'
        }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        fullName: t.String({ minLength: 1 }), // Ensure not empty
        tenantName: t.String({ minLength: 1 }),
        gstin: t.Optional(t.String()),
        pan: t.Optional(t.String())
      })
    }
  )
  .post(
    '/login',
    async ({ body, set, posthog }) => {
      try {
        const { email, password } = body

        // Login with Heimdall
        const heimdallResponse = await heimdallAuth.login({
          email,
          password,
          rememberMe: true
        })

        if (!heimdallResponse.success || !heimdallResponse.data) {
          throw new Error(heimdallResponse.error?.message || 'Login failed')
        }

        const { user: heimdallUser, accessToken, refreshToken } = heimdallResponse.data

        // Get user from local database
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            tenantUsers: {
              include: {
                tenant: true,
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!user) {
          set.status = 404
          return {
            success: false,
            error: 'USER_NOT_FOUND',
            message: 'User not found in local database'
          }
        }

        const tenantUser = user.tenantUsers[0]
        if (!tenantUser) {
          set.status = 404
          return {
            success: false,
            error: 'TENANT_NOT_FOUND',
            message: 'User not associated with any tenant'
          }
        }

        // Track login
        posthog?.track('user_login', {
          userId: user.id,
          tenantId: tenantUser.tenantId,
          authProvider: 'heimdall'
        })

        return {
          success: true,
          message: 'Login successful',
          data: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: tenantUser.role.name
            },
            tenant: {
              id: tenantUser.tenant.id,
              name: tenantUser.tenant.name,
              gstin: tenantUser.tenant.gstin
            },
            permissions: tenantUser.role.rolePermissions.map(rp => ({
              action: rp.permission.action,
              resource: rp.permission.resource
            }))
          }
        }

      } catch (error: any) {
        console.error('Heimdall login error:', error)
        set.status = error.statusCode || 401
        return {
          success: false,
          error: error.code || 'LOGIN_FAILED',
          message: error.message || 'Invalid credentials'
        }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String()
      })
    }
  )
  .post(
    '/logout',
    async ({ store, posthog, set }) => {
      try {
        // Logout from Heimdall (token from store)
        const token = store?.heimdallToken || ''
        if (token) {
          await heimdallAuth.logout(token)
        }

        // Track logout
        posthog?.track('user_logout', {
          userId: store?.userId,
          tenantId: store?.tenantId,
          authProvider: 'heimdall'
        })

        return {
          success: true,
          message: 'Logged out successfully'
        }

      } catch (error) {
        console.error('Heimdall logout error:', error)
        set.status = 500
        return {
          success: false,
          error: 'LOGOUT_FAILED',
          message: 'Failed to logout'
        }
      }
    }
  )
  .post(
    '/refresh',
    async ({ body, set }) => {
      try {
        // Refresh tokens with Heimdall
        const refreshToken = body?.refreshToken || ''
        if (!refreshToken) {
          throw new Error('No refresh token provided')
        }

        const heimdallResponse = await heimdallAuth.refresh(refreshToken)

        if (!heimdallResponse.success || !heimdallResponse.data) {
          throw new Error(heimdallResponse.error?.message || 'Refresh failed')
        }

        const tokens = heimdallResponse.data

        return {
          success: true,
          data: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenType: 'Bearer',
            expiresIn: tokens.expiresIn
          }
        }

      } catch (error: any) {
        console.error('Heimdall refresh error:', error)
        set.status = error.statusCode || 401
        return {
          success: false,
          error: error.code || 'REFRESH_FAILED',
          message: error.message || 'Token refresh failed'
        }
      }
    }
  )
  .get(
    '/profile',
    async ({ store, set }) => {
      try {
        if (!store.userId) {
          set.status = 401
          return {
            success: false,
            error: 'UNAUTHORIZED',
            message: 'Not authenticated'
          }
        }

        const user = await prisma.user.findUnique({
          where: { id: store.userId },
          include: {
            tenantUsers: {
              where: { tenantId: store.tenantId },
              include: {
                tenant: true,
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!user) {
          set.status = 404
          return {
            success: false,
            error: 'NOT_FOUND',
            message: 'User not found'
          }
        }

        const tenantUser = user.tenantUsers[0]
        if (!tenantUser) {
          set.status = 404
          return {
            success: false,
            error: 'NOT_FOUND',
            message: 'User not associated with tenant'
          }
        }

        return {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              role: tenantUser.role.name
            },
            tenant: {
              id: tenantUser.tenant.id,
              name: tenantUser.tenant.name,
              gstin: tenantUser.tenant.gstin
            },
            permissions: tenantUser.role.rolePermissions.map(rp => ({
              action: rp.permission.action,
              resource: rp.permission.resource
            }))
          }
        }

      } catch (error) {
        console.error('Profile fetch error:', error)
        set.status = 500
        return {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to fetch profile'
        }
      }
    }
  )
