import { z } from 'zod'

// GST States and their codes
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh'
}

// Standard GST Rates in India (as per 2024)
export const GST_RATES = {
  EXEMPT: 0,
  GST_5: 5,
  GST_12: 12,
  GST_18: 18,
  GST_28: 28
} as const

export type GSTRate = typeof GST_RATES[keyof typeof GST_RATES]

// GST Return Types
export enum GSTReturnType {
  GSTR1 = 'GSTR1',
  GSTR3B = 'GSTR3B',
  GSTR2A = 'GSTR2A',
  GSTR2B = 'GSTR2B',
  GSTR4 = 'GSTR4',
  GSTR9 = 'GSTR9',
  GSTR9C = 'GSTR9C'
}

// GST Invoice Types
export enum GSTInvoiceType {
  TAX_INVOICE = 'Tax Invoice',
  BILL_OF_SUPPLY = 'Bill of Supply',
  CREDIT_NOTE = 'Credit Note',
  DEBIT_NOTE = 'Debit Note',
  EXPORT_INVOICE = 'Export Invoice',
  SEZ_INVOICE = 'SEZ Invoice'
}

// Transaction Types for GST Returns
export enum GSTTransactionType {
  B2B = 'B2B', // Business to Business
  B2C = 'B2C', // Business to Consumer  
  B2CL = 'B2CL', // Business to Consumer Large (>Rs 2.5 lakh)
  EXPORT = 'EXP', // Export
  SEZ = 'SEZWP', // SEZ with payment
  SEZWOP = 'SEZWOP', // SEZ without payment
  DEEMED_EXPORT = 'DEXP',
  IMPORT = 'IMP'
}

// GSTIN Validation Schema
export const GSTINSchema = z.string()
  .length(15, 'GSTIN must be exactly 15 characters')
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')

// PAN Schema
export const PANSchema = z.string()
  .length(10, 'PAN must be exactly 10 characters')
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')

// HSN/SAC Code Schema
export const HSNSchema = z.string()
  .min(2, 'HSN code must be at least 2 digits')
  .max(8, 'HSN code cannot exceed 8 digits')
  .regex(/^[0-9]+$/, 'HSN code must contain only numbers')

export const SACSchema = z.string()
  .length(6, 'SAC code must be exactly 6 digits')
  .regex(/^[0-9]+$/, 'SAC code must contain only numbers')

// Tax Calculation Schemas
export const TaxCalculationInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  gstRate: z.number().min(0).max(50, 'GST rate must be between 0 and 50'),
  isInclusive: z.boolean().default(false),
  applyReverseCharge: z.boolean().default(false),
  isInterState: z.boolean().default(false),
  cessRate: z.number().min(0).default(0)
})

export type TaxCalculationInput = z.infer<typeof TaxCalculationInputSchema>

export interface TaxBreakdown {
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  totalTax: number
  totalAmount: number
  gstRate: number
  isInterState: boolean
  isInclusive: boolean
}

// Invoice Line Item for GST
export const GSTInvoiceLineItemSchema = z.object({
  serialNo: z.number().positive(),
  description: z.string().min(1, 'Description is required'),
  hsnSac: z.union([HSNSchema, SACSchema]).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(50),
  cessRate: z.number().min(0).default(0),
  isService: z.boolean().default(false)
})

export type GSTInvoiceLineItem = z.infer<typeof GSTInvoiceLineItemSchema>

// GST Invoice Schema
export const GSTInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.date(),
  invoiceType: z.nativeEnum(GSTInvoiceType),
  transactionType: z.nativeEnum(GSTTransactionType),
  placeOfSupply: z.string().length(2, 'Place of supply must be 2-digit state code'),
  
  // Supplier Details
  supplierGSTIN: GSTINSchema,
  supplierName: z.string().min(1, 'Supplier name is required'),
  supplierAddress: z.string().min(1, 'Supplier address is required'),
  supplierState: z.string().length(2, 'Supplier state must be 2-digit code'),
  
  // Customer Details  
  customerGSTIN: GSTINSchema.optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerAddress: z.string().min(1, 'Customer address is required'),
  customerState: z.string().length(2, 'Customer state must be 2-digit code'),
  
  // Line Items
  lineItems: z.array(GSTInvoiceLineItemSchema).min(1, 'At least one line item is required'),
  
  // Additional Details
  reverseCharge: z.boolean().default(false),
  ecommerceGSTIN: GSTINSchema.optional(),
  notes: z.string().optional(),
  
  // Totals (calculated)  
  taxableAmount: z.number().optional(),
  totalTax: z.number().optional(),
  totalAmount: z.number().optional()
})

export type GSTInvoice = z.infer<typeof GSTInvoiceSchema>

// GSTR-1 Return Data Structure
export interface GSTR1Return {
  gstin: string
  ret_period: string // Format: MMYYYY
  b2b: GSTR1B2BEntry[]
  b2cl: GSTR1B2CLEntry[]
  b2cs: GSTR1B2CSEntry[]
  exp: GSTR1ExportEntry[]
  cdnr: GSTR1CDNREntry[]
  cdnur: GSTR1CDNUREntry[]
  nil: GSTR1NilEntry
  hsn: GSTR1HSNEntry[]
}

export interface GSTR1B2BEntry {
  ctin: string // Customer GSTIN
  inv: {
    inum: string // Invoice number
    idt: string // Invoice date (DD-MM-YYYY)
    val: number // Invoice value
    pos: string // Place of supply
    rchrg: 'Y' | 'N' // Reverse charge
    etin?: string // E-commerce GSTIN
    itms: {
      num: number // Serial number
      itm_det: {
        csamt: number // Cess amount
        rt: number // Tax rate
        txval: number // Taxable value
        camt: number // CGST amount
        samt: number // SGST amount
        iamt: number // IGST amount
      }
    }[]
  }[]
}

export interface GSTR1B2CLEntry {
  pos: string // Place of supply
  inv: {
    inum: string
    idt: string
    val: number
    itms: {
      num: number
      itm_det: {
        csamt: number
        rt: number
        txval: number
        iamt: number
      }
    }[]
  }[]
}

export interface GSTR1B2CSEntry {
  sply_ty: 'INTRA' | 'INTER' // Supply type
  pos: string
  typ: 'OE' | 'E' // Transaction type
  rt: number // Tax rate
  txval: number
  iamt: number
  csamt: number
}

export interface GSTR1ExportEntry {
  exp_typ: 'WPAY' | 'WOPAY' // With/Without payment
  inv: {
    inum: string
    idt: string
    val: number
    sbpcode: string // Shipping bill port code
    sbnum: string // Shipping bill number
    sbdt: string // Shipping bill date
    itms: {
      num: number
      itm_det: {
        csamt: number
        rt: number
        txval: number
      }
    }[]
  }[]
}

export interface GSTR1CDNREntry {
  ctin: string
  nt: {
    ntty: 'C' | 'D' // Credit/Debit note
    nt_num: string // Note number
    nt_dt: string // Note date
    p_gst: 'Y' | 'N' // Pre-GST
    rsn: string // Reason
    val: number // Note value
    itms: {
      num: number
      itm_det: {
        csamt: number
        rt: number
        txval: number
        camt: number
        samt: number
        iamt: number
      }
    }[]
  }[]
}

export interface GSTR1CDNUREntry {
  typ: 'B2CL' | 'EXPWP' | 'EXPWOP'
  pos?: string
  nt: {
    ntty: 'C' | 'D'
    nt_num: string
    nt_dt: string
    val: number
    itms: {
      num: number
      itm_det: {
        csamt: number
        rt: number
        txval: number
        iamt: number
      }
    }[]
  }[]
}

export interface GSTR1NilEntry {
  inv: {
    sply_ty: 'INTRB2B' | 'INTRB2C' | 'INTERB2B' | 'INTERB2C'
    nil_amt: number
    expt_amt: number
    ngsup_amt: number
  }[]
}

export interface GSTR1HSNEntry {
  num: number
  hsn_sc: string
  desc: string
  uqc: string // Unit of quantity
  qty: number
  val: number
  txval: number
  iamt: number
  camt: number
  samt: number
  csamt: number
}

// GSTR-3B Return Data Structure  
export interface GSTR3BReturn {
  gstin: string
  ret_period: string
  
  // Table 3.1 - Outward Supplies and inward supplies liable to reverse charge
  sup_details: {
    osup_det: {
      txval: number // Taxable value
      iamt: number // IGST
      camt: number // CGST  
      samt: number // SGST
      csamt: number // Cess
    }
    osup_zero: {
      txval: number
      iamt: number
      csamt: number
    }
    osup_nil_exmp: {
      txval: number
    }
    isup_rev: {
      txval: number
      iamt: number
      camt: number
      samt: number
      csamt: number
    }
    osup_nongst: {
      txval: number
    }
  }
  
  // Table 3.2 - Of the supplies shown in 3.1 (a) above, details of inter-State supplies made
  inter_sup: {
    unreg_details: Array<{
      pos: string
      txval: number
      iamt: number
    }>
    comp_details: Array<{
      pos: string  
      txval: number
      iamt: number
    }>
    uin_details: Array<{
      pos: string
      txval: number
      iamt: number
    }>
  }
  
  // Table 4 - Eligible ITC
  itc_elg: {
    itc_avl: Array<{
      ty: 'IMPG' | 'IMPS' | 'ISRC' | 'ISD' | 'OTH'
      iamt: number
      camt: number
      samt: number
      csamt: number
    }>
    itc_rev: Array<{
      ty: 'RUL' | 'OTH'
      iamt: number
      camt: number
      samt: number
      csamt: number
    }>
    itc_net: {
      iamt: number
      camt: number
      samt: number
      csamt: number
    }
    itc_inelg: Array<{
      ty: 'RUL' | 'OTH'
      iamt: number
      camt: number
      samt: number
      csamt: number
    }>
  }
  
  // Table 5 - Values of exempt, nil rated and non-GST inward supplies
  inward_sup: {
    isup_details: Array<{
      ty: 'GST' | 'NONGST'
      inter: number
      intra: number
    }>
  }
}

// Error Types
export class GSTError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'GSTError'
  }
}

export class GSTINValidationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'GSTIN_VALIDATION_ERROR', details)
  }
}

export class TaxCalculationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'TAX_CALCULATION_ERROR', details)
  }
}

export class ReturnGenerationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'RETURN_GENERATION_ERROR', details)
  }
}