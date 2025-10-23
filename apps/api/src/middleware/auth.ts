/**
 * Authentication Helper Functions
 *
 * This module provides helper functions for permission checking and RBAC.
 * The main authentication is now handled by heimdall-auth middleware.
 *
 * @deprecated The JWT authMiddleware has been removed in favor of Heimdall authentication.
 * Use heimdallAuthMiddleware from './heimdall-auth' instead.
 */

import { prisma } from '@accounts/database'

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