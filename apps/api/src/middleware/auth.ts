import { Elysia } from 'elysia'
import { prisma } from '@accounts/database'

export const authMiddleware = async ({ jwt, cookie, set, store, headers }: any) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = cookie.auth?.value
    
    if (!token) {
      const authHeader = headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7)
      }
    }

    if (!token) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'No authentication token provided'
      }
    }

    const payload = await jwt.verify(token)

    if (!payload || !payload.userId || !payload.tenantId) {
      set.status = 401
      return {
        error: 'Unauthorized', 
        message: 'Invalid or expired token'
      }
    }

    // Get user with tenant relationship
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
        isActive: true
      },
      include: {
        tenantUsers: {
          where: {
            tenantId: payload.tenantId
          },
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
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'User not found or inactive'
      }
    }

    const tenantUser = user.tenantUsers[0]
    if (!tenantUser) {
      set.status = 401
      return {
        error: 'Unauthorized',
        message: 'User not associated with tenant'
      }
    }

    // Store user context in request
    store.userId = user.id
    store.tenantId = payload.tenantId
    store.roleId = tenantUser.roleId
    store.roleName = tenantUser.role.name
    store.user = user
    store.tenant = tenantUser.tenant
    store.permissions = tenantUser.role.rolePermissions.map(rp => ({
      action: rp.permission.action,
      resource: rp.permission.resource
    }))

  } catch (error) {
    console.error('Authentication error:', error)
    set.status = 401
    return {
      error: 'Unauthorized',
      message: 'Authentication failed'
    }
  }
}

// RBAC permission checking middleware
export const requirePermission = (resource: string, action: string) => {
  return async ({ store, set }: any) => {
    if (!store.permissions) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'No permissions found'
      }
    }

    const hasPermission = store.permissions.some((perm: any) =>
      perm.resource === resource && perm.action === action
    )

    if (!hasPermission) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: `Insufficient permissions: need ${action} on ${resource}`
      }
    }
  }
}

// RBAC permission checking middleware for multiple resources (OR logic)
export const requireAnyPermission = (resources: string[], action: string) => {
  return async ({ store, set }: any) => {
    if (!store.permissions) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: 'No permissions found'
      }
    }

    const hasPermission = resources.some(resource =>
      store.permissions.some((perm: any) =>
        perm.resource === resource && perm.action === action
      )
    )

    if (!hasPermission) {
      set.status = 403
      return {
        error: 'Forbidden',
        message: `Insufficient permissions: need ${action} on any of [${resources.join(', ')}]`
      }
    }
  }
}

// Convenience functions for common role checks
export const requireOwner = async ({ store, set }: any) => {
  if (store.roleName !== 'owner') {
    set.status = 403
    return {
      error: 'Forbidden',
      message: 'Owner access required'
    }
  }
}

export const requireOwnerOrAdmin = async ({ store, set }: any) => {
  if (!['owner', 'admin'].includes(store.roleName)) {
    set.status = 403
    return {
      error: 'Forbidden',
      message: 'Owner or admin access required'
    }
  }
}

// Tenant isolation middleware - ensures all DB operations are scoped to current tenant
export const tenantScope = {
  filters: {
    tenant: (store: any) => ({
      tenantId: store.tenantId
    }),
    
    userOwned: (store: any, userIdField = 'createdBy') => ({
      tenantId: store.tenantId,
      [userIdField]: store.userId
    })
  }
}

// Helper function to check if user can access a specific resource
export const canAccessResource = async (
  tenantId: string,
  userId: string,
  resource: string,
  action: string,
  resourceId?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantUsers: {
        where: { tenantId },
        include: {
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

  if (!user?.tenantUsers[0]) return false

  const permissions = user.tenantUsers[0].role.rolePermissions
  const hasPermission = permissions.some(rp => 
    rp.permission.resource === resource && 
    rp.permission.action === action
  )

  // For "own" resources, check if user created/owns the resource
  if (action.includes('_own') && resourceId) {
    // Implementation would depend on the specific resource type
    // This would check if the user owns the specific resource
  }

  return hasPermission
}