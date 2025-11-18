/**
 * TypeScript types for GST API
 */

// ==================== API Response Wrapper ====================

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ==================== GST Calculation ====================

export interface GSTCalculationRequest {
  amount: number
  gstRate: number
  supplierState: string
  customerState: string
  isInclusive?: boolean
  cessRate?: number
  applyReverseCharge?: boolean
}

export interface GSTCalculationResponse {
  taxableAmount: number
  igst: number
  cgst: number
  sgst: number
  cess: number
  totalTax: number
  totalAmount: number
  isInterState: boolean
  reverseCharge: boolean
}

// ==================== Validation ====================

export interface GSTINValidationRequest {
  gstin: string
}

export interface GSTINValidationResponse {
  isValid: boolean
  info?: {
    stateCode: string
    panNumber: string
    entityNumber: string
    checksum: string
    stateName?: string
  }
  error?: string
}

export interface PANValidationRequest {
  pan: string
}

export interface PANValidationResponse {
  isValid: boolean
  info?: {
    entityType: string
    holderName?: string
  }
  error?: string
}

export interface HSNValidationRequest {
  hsn: string
}

export interface HSNValidationResponse {
  isValid: boolean
  info?: {
    chapterCode: string
    chapterDescription: string
  }
  error?: string
}

export interface SACValidationRequest {
  sac: string
}

export interface SACValidationResponse {
  isValid: boolean
  info?: {
    category: string
    categoryDescription: string
  }
  error?: string
}

// ==================== HSN Registry ====================

export interface HSNChapter {
  code: string
  description: string
  section: string
}

export interface HSNCode {
  code: string
  description: string
  chapter: string
  gstRate: number
  cess?: number
  unit: string
}

export interface HSNLookupResult {
  isValid: boolean
  code: string
  description?: string
  gstRate?: number
  cess?: number
  unit?: string
  chapterDescription?: string
}

export interface HSNDetails {
  code: string
  chapter?: HSNChapter
  details?: HSNCode
  recommendedGSTRate?: number
}

// ==================== GST Returns ====================

export interface GSTR1ExportRequest {
  period: string // Format: MM-YYYY
  pretty?: boolean
  validate?: boolean
}

export interface GSTR1ExportResponse {
  filename: string
  content: string
  size: number
  validation?: {
    isValid: boolean
    errors: string[]
  }
  returnData?: any
}

export interface GSTR3BExportRequest {
  period: string // Format: MM-YYYY
  pretty?: boolean
  validate?: boolean
}

export interface GSTR3BExportResponse {
  filename: string
  content: string
  size: number
  validation?: {
    isValid: boolean
    errors: string[]
  }
  returnData?: any
}

// ==================== Portal Instructions ====================

export interface PortalInstruction {
  step: number
  action: string
  url?: string
}

export interface PortalResources {
  portal: string
  offlineTool: string
  tutorial: string
  helpdesk: string
}

export interface PortalInstructionsResponse {
  returnType: 'GSTR-1' | 'GSTR-3B'
  instructions: {
    instructions: PortalInstruction[]
    resources: PortalResources
    notes: string[]
  }
}

// ==================== Indian States ====================

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
  { code: '99', name: 'Centre Jurisdiction' }
] as const

// ==================== GST Rates ====================

export const GST_RATES = [0, 5, 12, 18, 28] as const

export type GSTRate = typeof GST_RATES[number]
