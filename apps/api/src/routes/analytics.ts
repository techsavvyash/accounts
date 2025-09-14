import { Elysia } from 'elysia'
import { prisma } from '@accounts/database'

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  .get('/dashboard', async ({ store }) => {
    try {
      const tenantId = store.tenantId

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant not found'
        }
      }

      // Get basic metrics
      const [
        totalInvoices,
        paidInvoices,
        totalInventoryItems,
        totalCustomers,
        totalVendors
      ] = await Promise.all([
        // Total invoices count
        prisma.invoice.count({
          where: { tenantId }
        }),

        // Paid invoices for revenue calculation
        prisma.invoice.findMany({
          where: {
            tenantId,
            status: 'PAID'
          },
          select: {
            totalAmount: true
          }
        }),

        // Total inventory items
        prisma.inventoryItem.count({
          where: { tenantId }
        }),

        // Total customers
        prisma.customer.count({
          where: { tenantId }
        }),

        // Total suppliers
        prisma.supplier.count({
          where: { tenantId }
        })
      ])

      // Calculate total revenue
      const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)

      // Mock percentage changes for now (in a real app, you'd compare with previous period)
      const mockData = {
        totalRevenue,
        revenueChange: 12.5,
        totalInvoices,
        invoiceChange: 8.2,
        inventoryItems: totalInventoryItems,
        inventoryChange: 5.7,
        activeAccounts: totalCustomers + totalVendors,
        accountsChange: 3.4,
        recentActivities: [
          { id: 1, type: "invoice", description: "Recent invoice created", time: "2 hours ago", status: "success" },
          { id: 2, type: "payment", description: "Payment received", time: "4 hours ago", status: "success" },
          { id: 3, type: "inventory", description: "Stock level updated", time: "6 hours ago", status: "success" },
          { id: 4, type: "account", description: "New customer added", time: "1 day ago", status: "success" }
        ]
      }

      return {
        success: true,
        ...mockData
      }

    } catch (error) {
      console.error('Dashboard analytics error:', error)
      return {
        success: false,
        error: 'Failed to fetch dashboard data'
      }
    }
  })