
// Quick script to add sample customers and invoices
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addSampleData() {
  console.log('Adding sample customers...')
  
  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      id: 'cust-1',
      name: 'ABC Corporation',
      email: 'contact@abc.com', 
      phone: '+91-9876543210',
      gstin: '29ABCDE1234F1Z5',
      address: '123 Business Street, Mumbai',
      tenantId: 'demo-tenant-id'
    }
  })
  
  const customer2 = await prisma.customer.create({
    data: {
      id: 'cust-2',
      name: 'XYZ Industries',
      email: 'info@xyz.com',
      phone: '+91-9876543211', 
      gstin: '29XYZDE1234F1Z6',
      address: '456 Corporate Ave, Delhi',
      tenantId: 'demo-tenant-id'
    }
  })
  
  console.log('Adding sample invoices...')
  
  // Create invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      customerId: customer1.id,
      issueDate: new Date('2025-09-19'),
      dueDate: new Date('2025-10-19'),
      status: 'SENT',
      subtotal: 10000.00,
      taxAmount: 1800.00,
      totalAmount: 11800.00,
      tenantId: 'demo-tenant-id'
    }
  })
  
  const invoice2 = await prisma.invoice.create({
    data: {
      id: 'inv-2',
      invoiceNumber: 'INV-002', 
      customerId: customer2.id,
      issueDate: new Date('2025-09-18'),
      dueDate: new Date('2025-10-18'),
      status: 'DRAFT',
      subtotal: 5000.00,
      taxAmount: 900.00,
      totalAmount: 5900.00,
      tenantId: 'demo-tenant-id'
    }
  })
  
  console.log('Sample data created successfully!')
  console.log('Customers:', [customer1.name, customer2.name])
  console.log('Invoices:', [invoice1.invoiceNumber, invoice2.invoiceNumber])
}

addSampleData().then(() => prisma.$disconnect())

