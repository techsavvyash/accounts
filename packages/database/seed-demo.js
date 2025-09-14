import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo data...')

  try {
    // Create system roles first
    const ownerRole = await prisma.role.upsert({
      where: { id: 'owner-role-id' },
      update: {},
      create: {
        id: 'owner-role-id',
        name: 'owner',
        description: 'Business owner with full access'
      }
    })

    const adminRole = await prisma.role.upsert({
      where: { id: 'admin-role-id' },
      update: {},
      create: {
        id: 'admin-role-id',
        name: 'admin',
        description: 'Administrative access'
      }
    })

    // Create demo tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: 'demo-tenant-id' },
      update: {},
      create: {
        id: 'demo-tenant-id',
        name: 'Demo Company',
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F'
      }
    })

    // Create demo users
    const users = [
      {
        id: 'admin-user-id',
        email: 'admin@company.com',
        password: 'demo123',
        fullName: 'Admin User',
        roleId: adminRole.id
      },
      {
        id: 'owner-user-id',
        email: 'owner@company.com',
        password: 'demo123',
        fullName: 'Owner User',
        roleId: ownerRole.id
      },
      {
        id: 'demo-user-id',
        email: 'demo@demo.com',
        password: 'demo123',
        fullName: 'Demo User',
        roleId: ownerRole.id
      }
    ]

    for (const userData of users) {
      const passwordHash = await bcrypt.hash(userData.password, 10)

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          id: userData.id,
          email: userData.email,
          passwordHash,
          fullName: userData.fullName
        }
      })

      // Link user to tenant
      await prisma.tenantUser.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: tenant.id
          }
        },
        update: {},
        create: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: userData.roleId
        }
      })

      console.log(`✅ Created user: ${userData.email}`)
    }

    // Create permissions
    const resources = ['inventory', 'invoice', 'customer', 'supplier', 'report', 'analytics']
    const actions = ['create', 'read', 'update', 'delete']

    console.log('\n🔐 Setting up permissions...')

    const permissions = []
    for (const resource of resources) {
      for (const action of actions) {
        const permission = await prisma.permission.upsert({
          where: { action_resource: { action, resource } },
          update: {},
          create: { action, resource }
        })
        permissions.push(permission)
      }
    }

    // Assign all permissions to admin role
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      })
    }

    // Assign basic permissions to owner role (inventory, invoice, customer, supplier)
    const ownerPermissions = permissions.filter(p =>
      ['inventory', 'invoice', 'customer', 'supplier'].includes(p.resource)
    )
    for (const permission of ownerPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ownerRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: ownerRole.id,
          permissionId: permission.id
        }
      })
    }

    console.log('\n🎉 Demo data seeded successfully!')
    console.log('\n📋 Demo Credentials:')
    console.log('Email: admin@company.com | Password: demo123')
    console.log('Email: owner@company.com | Password: demo123')
    console.log('Email: demo@demo.com | Password: demo123')

  } catch (error) {
    console.error('❌ Error seeding data:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })