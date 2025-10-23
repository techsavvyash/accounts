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

      // TODO: Calculate percentage changes by comparing with previous period
      const dashboardData = {
        totalRevenue,
        revenueChange: 0, // TODO: Compare with previous month's revenue
        totalInvoices,
        invoiceChange: 0, // TODO: Compare with previous month's invoices
        inventoryItems: totalInventoryItems,
        inventoryChange: 0, // TODO: Compare with previous month's inventory
        activeAccounts: totalCustomers + totalVendors,
        accountsChange: 0, // TODO: Compare with previous month's accounts
        recentActivities: [] // TODO: Implement real activity tracking from audit logs
      }

      return {
        success: true,
        ...dashboardData
      }

    } catch (error) {
      console.error('Dashboard analytics error:', error)
      return {
        success: false,
        error: 'Failed to fetch dashboard data'
      }
    }
  })