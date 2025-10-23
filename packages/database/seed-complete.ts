import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding complete demo data...')

  try {
    // ==================== ROLES & PERMISSIONS ====================
    console.log('\n📋 Creating roles and permissions...')

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

    const salesPersonRole = await prisma.role.upsert({
      where: { id: 'sales-role-id' },
      update: {},
      create: {
        id: 'sales-role-id',
        name: 'sales_person',
        description: 'Sales person with limited access'
      }
    })

    // Create permissions
    const resources = ['inventory', 'invoice', 'customer', 'supplier', 'report', 'analytics', 'inventory_item']
    const actions = ['create', 'read', 'update', 'delete']

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

    // Assign all permissions to owner role (owners have full access)
    for (const permission of permissions) {
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

    console.log('✅ Roles and permissions created')

    // ==================== TENANT ====================
    console.log('\n🏢 Creating tenant...')

    const tenant = await prisma.tenant.upsert({
      where: { id: 'demo-tenant-id' },
      update: {},
      create: {
        id: 'demo-tenant-id',
        name: 'TechCorp India Pvt Ltd',
        gstin: '27AABCT1332L1ZM', // Maharashtra GSTIN
        pan: 'AABCT1332L',
        address: '123 MG Road, Mumbai, Maharashtra - 400001',
        phone: '+91-22-1234-5678',
        email: 'contact@techcorp.in'
      }
    })

    console.log('✅ Tenant created: TechCorp India Pvt Ltd')

    // ==================== USERS ====================
    console.log('\n👥 Creating users...')

    const users = [
      {
        id: 'admin-user-id',
        email: 'admin@demo.com',
        password: 'admin123',
        fullName: 'Admin Demo',
        roleId: adminRole.id
      },
      {
        id: 'owner-user-id',
        email: 'owner@demo.com',
        password: 'owner123',
        fullName: 'Owner Demo',
        roleId: ownerRole.id
      },
      {
        id: 'sales-user-id',
        email: 'sales@demo.com',
        password: 'sales123',
        fullName: 'Sales Demo',
        roleId: salesPersonRole.id
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

    // ==================== CUSTOMERS ====================
    console.log('\n👨‍💼 Creating customers...')

    const customers = [
      {
        id: 'customer-1',
        name: 'Acme Corporation',
        gstin: '27AAAAA0000A1Z5', // Maharashtra (same state - intra-state)
        pan: 'AAAAA0000A',
        address: '456 Business Park, Mumbai, Maharashtra - 400002',
        phone: '+91-22-9876-5432',
        email: 'contact@acme.com',
        creditLimit: 500000
      },
      {
        id: 'customer-2',
        name: 'Global Enterprises',
        gstin: '29BBBBB1111B2Z6', // Karnataka (inter-state)
        pan: 'BBBBB1111B',
        address: '789 Tech Hub, Bangalore, Karnataka - 560001',
        phone: '+91-80-1234-5678',
        email: 'admin@global.com',
        creditLimit: 1000000
      },
      {
        id: 'customer-3',
        name: 'Frontend Test Co',
        gstin: '06CCCCC2222C3Z7', // Haryana (inter-state)
        pan: 'CCCCC2222C',
        address: '101 Cyber City, Gurgaon, Haryana - 122001',
        phone: '+91-124-111-2222',
        email: 'billing@frontend.com',
        creditLimit: 750000
      }
    ]

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: {},
        create: {
          ...customer,
          tenantId: tenant.id
        }
      })
      console.log(`✅ Created customer: ${customer.name}`)
    }

    // ==================== SUPPLIERS ====================
    console.log('\n🏭 Creating suppliers...')

    const suppliers = [
      {
        id: 'supplier-1',
        name: 'Electronics Wholesale Ltd',
        gstin: '27DDDDD3333D4Z8', // Maharashtra
        pan: 'DDDDD3333D',
        address: '202 Industrial Area, Mumbai, Maharashtra - 400050',
        phone: '+91-22-5555-6666',
        email: 'sales@ewholesale.com'
      },
      {
        id: 'supplier-2',
        name: 'Mobile Parts Distributor',
        gstin: '09EEEEE4444E5Z9', // Uttar Pradesh
        pan: 'EEEEE4444E',
        address: '303 Trade Center, Noida, Uttar Pradesh - 201301',
        phone: '+91-120-7777-8888',
        email: 'info@mobileparts.com'
      }
    ]

    for (const supplier of suppliers) {
      await prisma.supplier.upsert({
        where: { id: supplier.id },
        update: {},
        create: {
          ...supplier,
          tenantId: tenant.id
        }
      })
      console.log(`✅ Created supplier: ${supplier.name}`)
    }

    // ==================== INVENTORY ITEMS ====================
    console.log('\n📦 Creating inventory items...')

    const inventoryItems = [
      {
        id: 'item-1',
        sku: 'LAPTOP-HP-001',
        name: 'HP EliteBook 840 G8',
        description: 'Intel Core i7, 16GB RAM, 512GB SSD',
        hsnCode: '85171200',
        purchasePrice: 65000,
        salePrice: 85000,
        reorderPoint: 5
      },
      {
        id: 'item-2',
        sku: 'PHONE-IP-001',
        name: 'iPhone 14 Pro 256GB',
        description: 'Space Black, 6.1-inch display',
        hsnCode: '85171200',
        purchasePrice: 110000,
        salePrice: 135000,
        reorderPoint: 3
      },
      {
        id: 'item-3',
        sku: 'TABLET-IPAD-001',
        name: 'iPad Air 5th Gen',
        description: '10.9-inch, Wi-Fi, 256GB',
        hsnCode: '85171200',
        purchasePrice: 55000,
        salePrice: 72000,
        reorderPoint: 5
      },
      {
        id: 'item-4',
        sku: 'MONITOR-DELL-001',
        name: 'Dell UltraSharp 27" 4K',
        description: 'USB-C, HDR400, IPS Panel',
        hsnCode: '85285210',
        purchasePrice: 35000,
        salePrice: 48000,
        reorderPoint: 8
      },
      {
        id: 'item-5',
        sku: 'KEYBOARD-LOGI-001',
        name: 'Logitech MX Keys',
        description: 'Wireless, Backlit, Multi-device',
        hsnCode: '84716070',
        purchasePrice: 8000,
        salePrice: 12500,
        reorderPoint: 15
      }
    ]

    for (const item of inventoryItems) {
      await prisma.inventoryItem.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          tenantId: tenant.id
        }
      })
      console.log(`✅ Created inventory item: ${item.name}`)
    }

    // ==================== INVOICES ====================
    console.log('\n📄 Creating invoices...')

    const invoices = [
      {
        id: 'invoice-1',
        invoiceNumber: 'INV-2024-001',
        customerId: 'customer-1', // Acme Corporation (intra-state)
        invoiceDate: new Date('2024-12-01'),
        dueDate: new Date('2024-12-31'),
        status: 'PAID',
        totalAmount: 100000,
        taxAmount: 18000,
        notes: 'Bulk order - Laptops and accessories'
      },
      {
        id: 'invoice-2',
        invoiceNumber: 'INV-2024-002',
        customerId: 'customer-2', // Global Enterprises (inter-state)
        invoiceDate: new Date('2024-12-05'),
        dueDate: new Date('2025-01-05'),
        status: 'SENT',
        totalAmount: 270000,
        taxAmount: 48600,
        notes: 'Mobile phone order'
      },
      {
        id: 'invoice-3',
        invoiceNumber: 'INV-2024-003',
        customerId: 'customer-3', // Frontend Test Co (inter-state)
        invoiceDate: new Date('2024-12-10'),
        dueDate: new Date('2025-01-10'),
        status: 'SENT',
        totalAmount: 160000,
        taxAmount: 28800,
        notes: 'Office setup - Monitors and tablets'
      }
    ]

    for (const invoice of invoices) {
      await prisma.invoice.upsert({
        where: { id: invoice.id },
        update: {},
        create: {
          ...invoice,
          tenantId: tenant.id
        }
      })
      console.log(`✅ Created invoice: ${invoice.invoiceNumber}`)
    }

    // ==================== INVOICE ITEMS ====================
    console.log('\n📝 Creating invoice items...')

    const invoiceItems = [
      // Invoice 1 items (Acme Corporation - intra-state)
      {
        invoiceId: 'invoice-1',
        inventoryItemId: 'item-1',
        description: 'HP EliteBook 840 G8',
        quantity: 1,
        unitPrice: 85000,
        lineTotal: 100300 // 85000 + 15300 GST
      },
      {
        invoiceId: 'invoice-1',
        inventoryItemId: 'item-5',
        description: 'Logitech MX Keys',
        quantity: 1,
        unitPrice: 12500,
        lineTotal: 14750 // 12500 + 2250 GST
      },
      // Invoice 2 items (Global Enterprises - inter-state)
      {
        invoiceId: 'invoice-2',
        inventoryItemId: 'item-2',
        description: 'iPhone 14 Pro 256GB',
        quantity: 2,
        unitPrice: 135000,
        lineTotal: 318600 // 270000 + 48600 GST
      },
      // Invoice 3 items (Frontend Test Co - inter-state)
      {
        invoiceId: 'invoice-3',
        inventoryItemId: 'item-4',
        description: 'Dell UltraSharp 27" 4K',
        quantity: 2,
        unitPrice: 48000,
        lineTotal: 113280 // 96000 + 17280 GST
      },
      {
        invoiceId: 'invoice-3',
        inventoryItemId: 'item-3',
        description: 'iPad Air 5th Gen',
        quantity: 1,
        unitPrice: 72000,
        lineTotal: 84960 // 72000 + 12960 GST
      }
    ]

    for (const item of invoiceItems) {
      await prisma.invoiceLineItem.create({
        data: item
      })
    }
    console.log(`✅ Created ${invoiceItems.length} invoice items`)

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Complete demo data seeded successfully!')
    console.log('='.repeat(60))

    console.log('\n📋 Test Credentials:')
    console.log('┌─────────────────────────────────────────────────┐')
    console.log('│ Admin Account                                   │')
    console.log('│ Email:    admin@demo.com                        │')
    console.log('│ Password: admin123                              │')
    console.log('├─────────────────────────────────────────────────┤')
    console.log('│ Owner Account                                   │')
    console.log('│ Email:    owner@demo.com                        │')
    console.log('│ Password: owner123                              │')
    console.log('├─────────────────────────────────────────────────┤')
    console.log('│ Sales Person Account                            │')
    console.log('│ Email:    sales@demo.com                        │')
    console.log('│ Password: sales123                              │')
    console.log('└─────────────────────────────────────────────────┘')

    console.log('\n📊 Seeded Data Summary:')
    console.log(`  • Tenant: TechCorp India Pvt Ltd`)
    console.log(`  • Users: ${users.length} (admin, owner, sales person)`)
    console.log(`  • Customers: ${customers.length}`)
    console.log(`  • Suppliers: ${suppliers.length}`)
    console.log(`  • Inventory Items: ${inventoryItems.length}`)
    console.log(`  • Invoices: ${invoices.length}`)
    console.log(`  • Invoice Items: ${invoiceItems.length}`)

    console.log('\n💡 GST Test Scenarios:')
    console.log('  • Intra-state (CGST+SGST): Acme Corporation (Maharashtra)')
    console.log('  • Inter-state (IGST): Global Enterprises (Karnataka)')
    console.log('  • Inter-state (IGST): Frontend Test Co (Haryana)')

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
