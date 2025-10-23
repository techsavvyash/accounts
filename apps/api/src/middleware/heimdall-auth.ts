import { Elysia } from 'elysia'
import { prisma } from '@accounts/database'
import { heimdallAuth } from '../lib/heimdall-simple'

/**
 * Heimdall Authentication Middleware
 *
 * This middleware integrates with Heimdall authentication service
 * for validating JWT tokens and managing user sessions.
 *
 * Uses @elysiajs/bearer plugin for token extraction
 */

export const heimdallAuthMiddleware = async ({ bearer, set, store }: any) => {
  try {
    // bearer is automatically extracted by @elysiajs/bearer plugin
    if (!bearer) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'No authentication token provided'
      }
    }

    // Verify token with Heimdall SDK
    const verifyResponse = await heimdallAuth.verify(bearer)

    if (!verifyResponse.success || !verifyResponse.data?.user) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      }
    }

    const heimdallUser = verifyResponse.data.user

    // Check if user exists in local database
    let localUser = await prisma.user.findUnique({
      where: { email: heimdallUser.email },
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

    // If user doesn't exist locally, create them
    if (!localUser) {
      // Auto-provision user from Heimdall
      const tenantId = heimdallUser.tenantId

      // Check if tenant exists
      let tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      })

      if (!tenant) {
        // Create tenant if it doesn't exist
        tenant = await prisma.tenant.create({
          data: {
            id: tenantId,
            name: heimdallUser.metadata?.tenantName || 'Default Tenant',
            email: heimdallUser.email
          }
        })
      }

      // Create user
      localUser = await prisma.user.create({
        data: {
          id: heimdallUser.id,
          email: heimdallUser.email,
          passwordHash: '', // Managed by Heimdall
          fullName: `${heimdallUser.firstName || ''} ${heimdallUser.lastName || ''}`.trim(),
          isActive: true
        },
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

      // Get or create default role
      let role = await prisma.role.findFirst({
        where: {
          tenantId: tenant.id,
          name: 'owner'
        }
      })

      if (!role) {
        role = await prisma.role.findFirst({
          where: {
            tenantId: null,
            name: 'owner'
          }
        })
      }

      if (role) {
        // Associate user with tenant
        await prisma.tenantUser.create({
          data: {
            userId: localUser.id,
            tenantId: tenant.id,
            roleId: role.id
          }
        })

        // Reload user with relationships
        localUser = await prisma.user.findUnique({
          where: { id: localUser.id },
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
      }
    }

    if (!localUser || !localUser.isActive) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'User not found or inactive'
      }
    }

    // Get tenant user relationship
    const tenantUser = localUser.tenantUsers[0]
    if (!tenantUser) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'User not associated with tenant'
      }
    }

    // Populate store with user context
    store.userId = localUser.id
    store.tenantId = tenantUser.tenantId
    store.roleId = tenantUser.roleId
    store.roleName = tenantUser.role.name
    store.user = localUser
    store.tenant = tenantUser.tenant
    store.permissions = tenantUser.role.rolePermissions.map(rp => ({
      action: rp.permission.action,
      resource: rp.permission.resource
    }))
    store.heimdallUser = heimdallUser

  } catch (error: any) {
    console.error('Heimdall authentication error:', error)

    // Handle Heimdall service unavailable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      set.status = 503
      return {
        error: 'Service Unavailable',
        message: 'Authentication service is temporarily unavailable'
      }
    }

    set.status = 401
    return {
      error: 'Unauthorized',
      message: 'Authentication failed'
    }
  }
}
