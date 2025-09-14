import { prisma } from '@accounts/database'

export interface Party {
  id: string
  type: 'customer' | 'supplier'
  name: string
  gstin?: string | null
  pan?: string | null
  address?: any
  phone?: string | null
  email?: string | null
  creditLimit?: number | null // Only for customers
  createdAt: Date
  updatedAt: Date
}

export interface CreateCustomerData {
  name: string
  gstin?: string
  pan?: string
  address?: any
  phone?: string
  email?: string
  creditLimit?: number
}

export interface CreateSupplierData {
  name: string
  gstin?: string
  pan?: string
  address?: any
  phone?: string
  email?: string
}

export interface UpdatePartyData {
  name?: string
  gstin?: string
  pan?: string
  address?: any
  phone?: string
  email?: string
  creditLimit?: number // Only applicable for customers
}

export class PartiesService {
  /**
   * Get all parties (customers + suppliers) with pagination and search
   */
  static async getParties(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      search?: string
      type?: 'customer' | 'supplier'
      gstin?: string
    } = {}
  ) {
    const { page = 1, limit = 50, search, type, gstin } = options
    const skip = (page - 1) * limit

    // Build search conditions
    const searchConditions: any = {}
    if (search) {
      searchConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (gstin) {
      searchConditions.gstin = { contains: gstin, mode: 'insensitive' }
    }

    const whereClause = { tenantId, ...searchConditions }

    let customers: any[] = []
    let suppliers: any[] = []

    // Fetch data based on type filter
    if (!type || type === 'customer') {
      customers = await prisma.customer.findMany({
        where: whereClause,
        skip: !type ? skip : 0,
        take: !type ? limit : undefined,
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!type || type === 'supplier') {
      suppliers = await prisma.supplier.findMany({
        where: whereClause,
        skip: !type ? (customers.length >= limit ? 0 : Math.max(0, skip - customers.length)) : 0,
        take: !type ? Math.max(0, limit - customers.length) : undefined,
        orderBy: { createdAt: 'desc' }
      })
    }

    // Transform to unified Party interface
    const customerParties: Party[] = customers.map(customer => ({
      ...customer,
      type: 'customer' as const,
      creditLimit: customer.creditLimit?.toNumber() || null
    }))

    const supplierParties: Party[] = suppliers.map(supplier => ({
      ...supplier,
      type: 'supplier' as const,
      creditLimit: null
    }))

    // Combine and sort by creation date
    const allParties = [...customerParties, ...supplierParties]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)

    // Get total counts for pagination
    const [customerCount, supplierCount] = await Promise.all([
      !type || type === 'customer' ? prisma.customer.count({ where: whereClause }) : 0,
      !type || type === 'supplier' ? prisma.supplier.count({ where: whereClause }) : 0
    ])

    const total = customerCount + supplierCount

    return {
      parties: allParties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get customers only
   */
  static async getCustomers(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      search?: string
      gstin?: string
    } = {}
  ) {
    const { page = 1, limit = 50, search, gstin } = options
    const skip = (page - 1) * limit

    const searchConditions: any = {}
    if (search) {
      searchConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (gstin) {
      searchConditions.gstin = { contains: gstin, mode: 'insensitive' }
    }

    const whereClause = { tenantId, ...searchConditions }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where: whereClause })
    ])

    const customerParties: Party[] = customers.map(customer => ({
      ...customer,
      type: 'customer' as const,
      creditLimit: customer.creditLimit?.toNumber() || null
    }))

    return {
      parties: customerParties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get suppliers only
   */
  static async getSuppliers(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      search?: string
      gstin?: string
    } = {}
  ) {
    const { page = 1, limit = 50, search, gstin } = options
    const skip = (page - 1) * limit

    const searchConditions: any = {}
    if (search) {
      searchConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (gstin) {
      searchConditions.gstin = { contains: gstin, mode: 'insensitive' }
    }

    const whereClause = { tenantId, ...searchConditions }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.supplier.count({ where: whereClause })
    ])

    const supplierParties: Party[] = suppliers.map(supplier => ({
      ...supplier,
      type: 'supplier' as const,
      creditLimit: null
    }))

    return {
      parties: supplierParties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Get party by ID (checks both customers and suppliers)
   */
  static async getPartyById(tenantId: string, partyId: string): Promise<Party | null> {
    // Try to find in customers first
    const customer = await prisma.customer.findFirst({
      where: { id: partyId, tenantId }
    })

    if (customer) {
      return {
        ...customer,
        type: 'customer' as const,
        creditLimit: customer.creditLimit?.toNumber() || null
      }
    }

    // Try to find in suppliers
    const supplier = await prisma.supplier.findFirst({
      where: { id: partyId, tenantId }
    })

    if (supplier) {
      return {
        ...supplier,
        type: 'supplier' as const,
        creditLimit: null
      }
    }

    return null
  }

  /**
   * Create a new customer
   */
  static async createCustomer(tenantId: string, data: CreateCustomerData) {
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        phone: data.phone,
        email: data.email,
        creditLimit: data.creditLimit
      }
    })

    return {
      ...customer,
      type: 'customer' as const,
      creditLimit: customer.creditLimit?.toNumber() || null
    }
  }

  /**
   * Create a new supplier
   */
  static async createSupplier(tenantId: string, data: CreateSupplierData) {
    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name: data.name,
        gstin: data.gstin,
        pan: data.pan,
        address: data.address,
        phone: data.phone,
        email: data.email
      }
    })

    return {
      ...supplier,
      type: 'supplier' as const,
      creditLimit: null
    }
  }

  /**
   * Update a party (auto-detects customer/supplier)
   */
  static async updateParty(tenantId: string, partyId: string, data: UpdatePartyData): Promise<Party> {
    // First check if it's a customer
    const existingCustomer = await prisma.customer.findFirst({
      where: { id: partyId, tenantId }
    })

    if (existingCustomer) {
      const updatedCustomer = await prisma.customer.update({
        where: { id: partyId },
        data: {
          name: data.name,
          gstin: data.gstin,
          pan: data.pan,
          address: data.address,
          phone: data.phone,
          email: data.email,
          creditLimit: data.creditLimit
        }
      })

      return {
        ...updatedCustomer,
        type: 'customer' as const,
        creditLimit: updatedCustomer.creditLimit?.toNumber() || null
      }
    }

    // Try to update as supplier
    const existingSupplier = await prisma.supplier.findFirst({
      where: { id: partyId, tenantId }
    })

    if (existingSupplier) {
      const updatedSupplier = await prisma.supplier.update({
        where: { id: partyId },
        data: {
          name: data.name,
          gstin: data.gstin,
          pan: data.pan,
          address: data.address,
          phone: data.phone,
          email: data.email
        }
      })

      return {
        ...updatedSupplier,
        type: 'supplier' as const,
        creditLimit: null
      }
    }

    throw new Error('Party not found')
  }

  /**
   * Delete a party (auto-detects customer/supplier)
   */
  static async deleteParty(tenantId: string, partyId: string): Promise<boolean> {
    // Try to delete from customers first
    try {
      await prisma.customer.delete({
        where: { id: partyId, tenantId }
      })
      return true
    } catch (error) {
      // Not found in customers, try suppliers
    }

    // Try to delete from suppliers
    try {
      await prisma.supplier.delete({
        where: { id: partyId, tenantId }
      })
      return true
    } catch (error) {
      // Not found in either table
      return false
    }
  }
}