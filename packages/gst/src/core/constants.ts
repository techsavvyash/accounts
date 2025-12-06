/**
 * GST State Codes for all Indian states and UTs
 */
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

/**
 * Standard GST Rates in India (as per 2024)
 */
export const GST_RATES = {
  EXEMPT: 0,
  GST_5: 5,
  GST_12: 12,
  GST_18: 18,
  GST_28: 28
} as const

export type GSTRate = typeof GST_RATES[keyof typeof GST_RATES]

/**
 * GST Return Types
 */
export enum GSTReturnType {
  GSTR1 = 'GSTR1',
  GSTR3B = 'GSTR3B',
  GSTR2A = 'GSTR2A',
  GSTR2B = 'GSTR2B',
  GSTR4 = 'GSTR4',
  GSTR9 = 'GSTR9',
  GSTR9C = 'GSTR9C'
}

/**
 * GST Invoice Types
 */
export enum GSTInvoiceType {
  TAX_INVOICE = 'Tax Invoice',
  BILL_OF_SUPPLY = 'Bill of Supply',
  CREDIT_NOTE = 'Credit Note',
  DEBIT_NOTE = 'Debit Note',
  EXPORT_INVOICE = 'Export Invoice',
  SEZ_INVOICE = 'SEZ Invoice'
}

/**
 * Transaction Types for GST Returns
 */
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
