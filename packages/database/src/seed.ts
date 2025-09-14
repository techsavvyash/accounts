import { prisma } from './index'

async function main() {
  console.log('🌱 Seeding database...')

  // Create system roles
  const ownerRole = await prisma.role.create({
    data: {
      name: 'owner',
      description: 'Full access to tenant data including billing and user management'
    }
  })

  const adminRole = await prisma.role.create({
    data: {
      name: 'admin', 
      description: 'Administrative access to business operations'
    }
  })

  const salesPersonRole = await prisma.role.create({
    data: {
      name: 'sales_person',
      description: 'Limited access focused on sales operations'
    }
  })

  // Create permissions
  const permissions = [
    // Invoice permissions
    { action: 'create', resource: 'invoice' },
    { action: 'read', resource: 'invoice' },
    { action: 'update', resource: 'invoice' },
    { action: 'delete', resource: 'invoice' },
    { action: 'void', resource: 'invoice' },
    
    // Customer permissions
    { action: 'create', resource: 'customer' },
    { action: 'read', resource: 'customer' },
    { action: 'update', resource: 'customer' },
    { action: 'delete', resource: 'customer' },
    
    // Inventory permissions
    { action: 'create', resource: 'inventory' },
    { action: 'read', resource: 'inventory' },
    { action: 'update', resource: 'inventory' },
    { action: 'delete', resource: 'inventory' },
    
    // Inventory item permissions
    { action: 'create', resource: 'inventory_item' },
    { action: 'read', resource: 'inventory_item' },
    { action: 'update', resource: 'inventory_item' },
    { action: 'delete', resource: 'inventory_item' },
    
    // Ledger/Accounting permissions
    { action: 'create', resource: 'journal_entry' },
    { action: 'read', resource: 'journal_entry' },
    { action: 'create', resource: 'account' },
    { action: 'read', resource: 'account' },
    
    // GST permissions
    { action: 'create', resource: 'gst_calculation' },
    { action: 'read', resource: 'gst_calculation' },
    { action: 'generate', resource: 'gst_return' },
    { action: 'read', resource: 'gst_return' },
    { action: 'file', resource: 'gst_return' },
    
    // Report permissions
    { action: 'read', resource: 'report_financial' },
    { action: 'read', resource: 'report_sales' },
    
    // User management permissions
    { action: 'create', resource: 'user' },
    { action: 'update', resource: 'user' },
    { action: 'delete', resource: 'user' },
    
    // Billing permissions
    { action: 'read', resource: 'billing' },
    { action: 'update', resource: 'billing' }
  ]

  const createdPermissions = await Promise.all(
    permissions.map(permission => 
      prisma.permission.create({ data: permission })
    )
  )

  // Map permissions to roles
  const rolePermissionMappings = {
    [ownerRole.id]: createdPermissions.map(p => p.id), // Owner has all permissions
    [adminRole.id]: createdPermissions
      .filter(p => p.resource !== 'billing' && p.resource !== 'user')
      .map(p => p.id), // Admin has all except billing and user management
    [salesPersonRole.id]: createdPermissions
      .filter(p => 
        (p.resource === 'invoice' && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'customer' && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'inventory' && p.action === 'read') ||
        (p.resource === 'inventory_item' && ['create', 'read', 'update'].includes(p.action)) ||
        (p.resource === 'report_sales' && p.action === 'read')
      )
      .map(p => p.id) // Sales person has limited permissions
  }

  // Create role-permission mappings
  for (const [roleId, permissionIds] of Object.entries(rolePermissionMappings)) {
    await Promise.all(
      permissionIds.map(permissionId =>
        prisma.rolePermission.create({
          data: {
            roleId,
            permissionId
          }
        })
      )
    )
  }

  // Create system tax rates (common GST rates in India)
  const taxRates = [
    { name: 'GST 0%', hsnCode: null, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    { name: 'GST 3%', hsnCode: null, cgst: 1.5, sgst: 1.5, igst: 3, cess: 0 },
    { name: 'GST 5%', hsnCode: null, cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
    { name: 'GST 12%', hsnCode: null, cgst: 6, sgst: 6, igst: 12, cess: 0 },
    { name: 'GST 18%', hsnCode: null, cgst: 9, sgst: 9, igst: 18, cess: 0 },
    { name: 'GST 28%', hsnCode: null, cgst: 14, sgst: 14, igst: 28, cess: 0 }
  ]

  await Promise.all(
    taxRates.map(taxRate =>
      prisma.taxRate.create({
        data: taxRate
      })
    )
  )

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${createdPermissions.length} permissions`)
  console.log(`Created ${taxRates.length} tax rates`)
  console.log('Created 3 system roles: owner, admin, sales_person')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })