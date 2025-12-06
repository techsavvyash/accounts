import { Elysia, t } from 'elysia'
import bcrypt from 'bcryptjs'
import { prisma, db } from '@accounts/database'
import { authSchema } from '@accounts/shared'
import { config } from '../config'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/register',
    async ({ body, set, posthog }) => {
      const { email, password, fullName, tenantName, gstin, pan } = body

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        set.status = 409
        return {
          error: 'Conflict',
          message: 'User with this email already exists'
        }
      }

      const passwordHash = await bcrypt.hash(password, 10)

      try {
        // Create tenant with default setup
        const tenant = await db.createTenantWithDefaults({
          name: tenantName,
          gstin,
          pan
        })

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            fullName
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

        posthog?.track('user_registered', {
          userId: user.id,
          tenantId: tenant.id,
          tenantName
        })

        return {
          success: true,
          message: 'Registration successful',
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            gstin: tenant.gstin
          }
        }

      } catch (error) {
        console.error('Registration error:', error)
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to create account'
        }
      }
    },
    {
      body: authSchema.register
    }
  )
  .post(
    '/login',
    async ({ body, jwt, cookie, set, posthog }) => {
      const { email, password, tenantId } = body

      // Find user
      const user = await prisma.user.findUnique({
        where: { email, isActive: true },
        include: {
          tenantUsers: {
            where: tenantId ? { tenantId } : undefined,
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
          message: 'Invalid credentials'
        }
      }

      // Validate password
      const validPassword = await bcrypt.compare(password, user.passwordHash)
      if (!validPassword) {
        set.status = 401
        return {
          error: 'Unauthorized',
          message: 'Invalid credentials'
        }
      }

      // If no tenantId specified and user belongs to multiple tenants, return tenant selection
      if (!tenantId && user.tenantUsers.length > 1) {
        return {
          requiresTenantSelection: true,
          tenants: user.tenantUsers.map(tu => ({
            id: tu.tenant.id,
            name: tu.tenant.name,
            role: tu.role.name
          }))
        }
      }

      // Get the tenant user relationship
      const tenantUser = tenantId 
        ? user.tenantUsers.find(tu => tu.tenantId === tenantId)
        : user.tenantUsers[0]

      if (!tenantUser) {
        set.status = 401
        return {
          error: 'Unauthorized',
          message: 'User not associated with specified tenant'
        }
      }

      // Create JWT payload
      const tokenPayload = {
        userId: user.id,
        tenantId: tenantUser.tenantId,
        roleId: tenantUser.roleId,
        email: user.email
      }

      const token = await jwt.sign(tokenPayload)
      
      // Create refresh token
      const refreshTokenPayload = {
        userId: user.id,
        tenantId: tenantUser.tenantId,
        type: 'refresh'
      }

      const refreshToken = await jwt.sign(refreshTokenPayload, {
        expiresIn: config.REFRESH_TOKEN_EXPIRY
      })

      // Store refresh token
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })

      // Set secure cookies
      cookie.auth.set({
        value: token,
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

      cookie.refresh.set({
        value: refreshToken,
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      })

      // Track login event
      posthog?.track('user_login', {
        userId: user.id,
        tenantId: tenantUser.tenantId,
        roleName: tenantUser.role.name
      })

      return {
        success: true,
        message: 'Login successful',
        token,
        refreshToken,
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
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
        tenantId: t.Optional(t.String())
      })
    }
  )
  .post(
    '/refresh',
    async ({ body, jwt, cookie, set }) => {
      const { refreshToken: tokenFromBody } = body
      const refreshToken = tokenFromBody || cookie.refresh?.value

      if (!refreshToken) {
        set.status = 401
        return {
          error: 'Unauthorized',
          message: 'No refresh token provided'
        }
      }

      try {
        // Verify refresh token
        const payload = await jwt.verify(refreshToken)
        if (!payload || payload.type !== 'refresh') {
          throw new Error('Invalid refresh token')
        }

        // Find stored refresh token
        const storedToken = await prisma.refreshToken.findUnique({
          where: { token: refreshToken },
          include: { 
            user: {
              include: {
                tenantUsers: {
                  where: { tenantId: payload.tenantId },
                  include: {
                    tenant: true,
                    role: true
                  }
                }
              }
            }
          }
        })

        if (!storedToken || storedToken.expiresAt < new Date()) {
          set.status = 401
          return {
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token'
          }
        }

        const tenantUser = storedToken.user.tenantUsers[0]
        if (!tenantUser) {
          set.status = 401
          return {
            error: 'Unauthorized',
            message: 'User not associated with tenant'
          }
        }

        // Generate new tokens
        const newTokenPayload = {
          userId: storedToken.user.id,
          tenantId: payload.tenantId,
          roleId: tenantUser.roleId,
          email: storedToken.user.email
        }

        const newToken = await jwt.sign(newTokenPayload)
        const newRefreshToken = await jwt.sign({
          userId: storedToken.user.id,
          tenantId: payload.tenantId,
          type: 'refresh'
        }, {
          expiresIn: config.REFRESH_TOKEN_EXPIRY
        })

        // Replace refresh token
        await prisma.refreshToken.delete({
          where: { id: storedToken.id }
        })

        await prisma.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: storedToken.user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })

        // Update cookies
        cookie.auth.set({
          value: newToken,
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60
        })

        cookie.refresh.set({
          value: newRefreshToken,
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60
        })

        return {
          success: true,
          token: newToken,
          refreshToken: newRefreshToken
        }

      } catch (error) {
        console.error('Token refresh error:', error)
        set.status = 401
        return {
          error: 'Unauthorized',
          message: 'Token refresh failed'
        }
      }
    },
    {
      body: t.Object({
        refreshToken: t.Optional(t.String())
      })
    }
  )
  .post(
    '/logout',
    async ({ cookie, store, posthog }) => {
      // Revoke refresh token if present
      if (cookie.refresh?.value) {
        await prisma.refreshToken.deleteMany({
          where: { token: cookie.refresh.value }
        })
      }

      // Clear cookies
      cookie.auth.remove()
      cookie.refresh.remove()

      // Track logout event
      posthog?.track('user_logout', {
        userId: store?.userId,
        tenantId: store?.tenantId
      })

      return { 
        success: true,
        message: 'Logged out successfully' 
      }
    }
  )
  .get(
    '/profile',
    async ({ store, set }) => {
      try {
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
            error: 'Not Found',
            message: 'User not found'
          }
        }

        const tenantUser = user.tenantUsers[0]
        if (!tenantUser) {
          set.status = 404
          return {
            error: 'Not Found',
            message: 'User not associated with tenant'
          }
        }

        return {
          success: true,
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
      } catch (error) {
        console.error('Profile fetch error:', error)
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: 'Failed to fetch profile'
        }
      }
    }
  )