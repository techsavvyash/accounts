/**
 * E-Way Bill Utility Functions
 */

import { ValidationError } from './types'

/**
 * E-Way Bill Utilities
 */
export class EWayBillUtils {
  /**
   * Validate GSTIN format
   */
  static validateGSTIN(gstin: string): boolean {
    if (!gstin || typeof gstin !== 'string') {
      return false
    }

    // GSTIN should be 15 characters
    if (gstin.length !== 15) {
      return false
    }

    // Format: 2 digits (state) + 10 chars (PAN) + 1 digit + 1 char + 1 checksum
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/
    return gstinPattern.test(gstin)
  }

  /**
   * Validate Pincode
   */
  static validatePincode(pincode: number): boolean {
    if (!pincode || typeof pincode !== 'number') {
      return false
    }

    // Indian pincode is 6 digits
    return pincode >= 100000 && pincode <= 999999
  }

  /**
   * Validate HSN Code
   */
  static validateHSN(hsnCode: number): boolean {
    if (!hsnCode || typeof hsnCode !== 'number') {
      return false
    }

    // HSN code can be 2, 4, 6, or 8 digits
    const hsnStr = hsnCode.toString()
    return [2, 4, 6, 8].includes(hsnStr.length)
  }

  /**
   * Validate State Code
   */
  static validateStateCode(stateCode: number): boolean {
    if (!stateCode || typeof stateCode !== 'number') {
      return false
    }

    // State codes range from 1 to 38 (including Union Territories)
    return stateCode >= 1 && stateCode <= 38
  }

  /**
   * Format date to DD/MM/YYYY
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date

    if (isNaN(d.getTime())) {
      throw new ValidationError('Invalid date')
    }

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    return `${day}/${month}/${year}`
  }

  /**
   * Parse DD/MM/YYYY to Date
   */
  static parseDate(dateStr: string): Date {
    const parts = dateStr.split('/')
    if (parts.length !== 3) {
      throw new ValidationError('Invalid date format. Expected DD/MM/YYYY')
    }

    const [day, month, year] = parts.map(p => parseInt(p, 10))
    const date = new Date(year, month - 1, day)

    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date')
    }

    return date
  }

  /**
   * Calculate E-Way Bill validity in days based on distance
   * As per GST rules:
   * - For normal cargo: 1 day per 200 km
   * - For Over Dimensional Cargo (ODC): 1 day per 20 km
   */
  static calculateValidity(distance: number, isODC: boolean = false): number {
    if (distance <= 0) {
      return 1
    }

    const kmPerDay = isODC ? 20 : 200
    return Math.ceil(distance / kmPerDay)
  }

  /**
   * Calculate validity end date
   */
  static calculateValidityDate(
    startDate: Date | string,
    distance: number,
    isODC: boolean = false
  ): Date {
    const start = typeof startDate === 'string' ? this.parseDate(startDate) : startDate
    const days = this.calculateValidity(distance, isODC)

    const validUpto = new Date(start)
    validUpto.setDate(validUpto.getDate() + days)

    return validUpto
  }

  /**
   * Check if E-Way Bill is still valid
   */
  static isValidityExpired(validUpto: Date | string): boolean {
    const expiryDate = typeof validUpto === 'string' ? this.parseDate(validUpto) : validUpto
    return Date.now() > expiryDate.getTime()
  }

  /**
   * Check if within extension window (8 hours before or after expiry)
   */
  static canExtendValidity(validUpto: Date | string): boolean {
    const expiryDate = typeof validUpto === 'string' ? this.parseDate(validUpto) : validUpto
    const now = Date.now()
    const eightHours = 8 * 60 * 60 * 1000

    const beforeWindow = expiryDate.getTime() - eightHours
    const afterWindow = expiryDate.getTime() + eightHours

    return now >= beforeWindow && now <= afterWindow
  }

  /**
   * Check if within 24-hour cancellation window
   */
  static canCancel(ewayBillDate: Date | string): boolean {
    const billDate = typeof ewayBillDate === 'string' ? this.parseDate(ewayBillDate) : ewayBillDate
    const twentyFourHours = 24 * 60 * 60 * 1000

    return Date.now() - billDate.getTime() <= twentyFourHours
  }

  /**
   * Validate vehicle number format
   */
  static validateVehicleNumber(vehicleNo: string): boolean {
    if (!vehicleNo || typeof vehicleNo !== 'string') {
      return false
    }

    // Remove spaces and convert to uppercase
    const cleaned = vehicleNo.replace(/\s/g, '').toUpperCase()

    // Indian vehicle number format: XX00XX0000 or XX00XXX0000
    // State code (2 letters) + District code (2 digits) + Series (1-3 letters) + Number (4 digits)
    const vehiclePattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}$/

    return vehiclePattern.test(cleaned)
  }

  /**
   * Format vehicle number
   */
  static formatVehicleNumber(vehicleNo: string): string {
    return vehicleNo.replace(/\s/g, '').toUpperCase()
  }

  /**
   * Calculate total invoice value including all taxes
   */
  static calculateTotalInvoiceValue(
    taxableAmount: number,
    cgst: number = 0,
    sgst: number = 0,
    igst: number = 0,
    cess: number = 0,
    otherValue: number = 0
  ): number {
    return taxableAmount + cgst + sgst + igst + cess + otherValue
  }

  /**
   * Round to 2 decimal places
   */
  static round(value: number): number {
    return Math.round(value * 100) / 100
  }

  /**
   * Get state name from state code
   */
  static getStateName(stateCode: number): string {
    const stateMap: Record<number, string> = {
      1: 'Jammu and Kashmir',
      2: 'Himachal Pradesh',
      3: 'Punjab',
      4: 'Chandigarh',
      5: 'Uttarakhand',
      6: 'Haryana',
      7: 'Delhi',
      8: 'Rajasthan',
      9: 'Uttar Pradesh',
      10: 'Bihar',
      11: 'Sikkim',
      12: 'Arunachal Pradesh',
      13: 'Nagaland',
      14: 'Manipur',
      15: 'Mizoram',
      16: 'Tripura',
      17: 'Meghalaya',
      18: 'Assam',
      19: 'West Bengal',
      20: 'Jharkhand',
      21: 'Odisha',
      22: 'Chhattisgarh',
      23: 'Madhya Pradesh',
      24: 'Gujarat',
      25: 'Daman and Diu',
      26: 'Dadra and Nagar Haveli',
      27: 'Maharashtra',
      28: 'Andhra Pradesh (Old)',
      29: 'Karnataka',
      30: 'Goa',
      31: 'Lakshadweep',
      32: 'Kerala',
      33: 'Tamil Nadu',
      34: 'Puducherry',
      35: 'Andaman and Nicobar Islands',
      36: 'Telangana',
      37: 'Andhra Pradesh',
      38: 'Ladakh'
    }

    return stateMap[stateCode] || 'Unknown'
  }

  /**
   * Validate document number format
   */
  static validateDocumentNumber(docNo: string): boolean {
    if (!docNo || typeof docNo !== 'string') {
      return false
    }

    // Document number should be alphanumeric and max 16 characters
    return docNo.length > 0 && docNo.length <= 16 && /^[A-Z0-9/-]+$/i.test(docNo)
  }

  /**
   * Check if E-Way Bill is required based on value and distance
   */
  static isEWayBillRequired(invoiceValue: number, distance?: number): boolean {
    // E-Way Bill is required for consignments > ₹50,000
    // Some states have different thresholds or special rules

    if (invoiceValue > 50000) {
      return true
    }

    // For certain goods, E-Way Bill may be required regardless of value
    // This should be customized based on specific business rules

    return false
  }

  /**
   * Generate request ID for API calls
   */
  static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Sanitize string for API submission
   */
  static sanitizeString(str: string): string {
    return str.trim().replace(/[^\w\s.-]/gi, '')
  }

  /**
   * Validate quantity unit
   */
  static isValidQuantityUnit(unit: string): boolean {
    const validUnits = [
      'BAG', 'BAL', 'BDL', 'BKL', 'BOU', 'BOX', 'BTL', 'BUN', 'CAN', 'CBM',
      'CCM', 'CMS', 'CTN', 'DOZ', 'DRM', 'GGK', 'GMS', 'GRS', 'GYD', 'KGS',
      'KLR', 'KME', 'LTR', 'MLT', 'MTR', 'MTS', 'NOS', 'PAC', 'PCS', 'PRS',
      'QTL', 'ROL', 'SET', 'SQF', 'SQM', 'SQY', 'TBS', 'TGM', 'THD', 'TON',
      'TUB', 'UGS', 'UNT', 'YDS', 'OTH'
    ]

    return validUnits.includes(unit.toUpperCase())
  }
}
