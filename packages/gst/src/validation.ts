import { GSTINValidationError, GST_STATE_CODES, PANSchema, HSNSchema, SACSchema } from './types'

/**
 * Validates GSTIN format and checksum
 */
export class GSTINValidator {
  private static readonly GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

  /**
   * Validates GSTIN format, checksum, and components
   */
  static validate(gstin: string): boolean {
    if (!gstin || typeof gstin !== 'string') {
      throw new GSTINValidationError('GSTIN must be a non-empty string')
    }

    // Remove spaces and convert to uppercase
    const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase()

    // Check length
    if (cleanGSTIN.length !== 15) {
      throw new GSTINValidationError('GSTIN must be exactly 15 characters long')
    }

    // Check format
    if (!this.GSTIN_REGEX.test(cleanGSTIN)) {
      throw new GSTINValidationError('GSTIN format is invalid')
    }

    // Validate state code
    const stateCode = cleanGSTIN.substring(0, 2)
    if (!GST_STATE_CODES[stateCode]) {
      throw new GSTINValidationError(`Invalid state code: ${stateCode}`)
    }

    // Validate PAN
    const pan = cleanGSTIN.substring(2, 12)
    try {
      PANSchema.parse(pan)
    } catch {
      throw new GSTINValidationError('Invalid PAN embedded in GSTIN')
    }

    // Validate entity number
    const entityNumber = cleanGSTIN.substring(12, 13)
    if (!/^[1-9A-Z]$/.test(entityNumber)) {
      throw new GSTINValidationError('Invalid entity number in GSTIN')
    }

    // Validate check code using Luhn algorithm variant
    if (!this.validateChecksum(cleanGSTIN)) {
      throw new GSTINValidationError('GSTIN checksum validation failed')
    }

    return true
  }

  /**
   * Extracts information from a valid GSTIN
   */
  static extract(gstin: string) {
    this.validate(gstin) // This will throw if invalid

    const cleanGSTIN = gstin.replace(/\s+/g, '').toUpperCase()
    
    return {
      gstin: cleanGSTIN,
      stateCode: cleanGSTIN.substring(0, 2),
      stateName: GST_STATE_CODES[cleanGSTIN.substring(0, 2)],
      pan: cleanGSTIN.substring(2, 12),
      entityNumber: cleanGSTIN.substring(12, 13),
      checkDigit: cleanGSTIN.substring(14, 15)
    }
  }

  /**
   * Validates GSTIN checksum using the algorithm specified by GSTN
   */
  private static validateChecksum(gstin: string): boolean {
    const factor = 2
    let sum = 0
    let checkCodePoint = 0
    const cpChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const inputChars = gstin.substring(0, 14)

    for (let i = inputChars.length - 1; i >= 0; i--) {
      const codePoint = cpChars.indexOf(inputChars[i])
      let product = codePoint * factor
      
      if (product > 35) {
        product = Math.floor(product / 36) + (product % 36)
      }
      
      sum += product
    }

    checkCodePoint = (36 - (sum % 36)) % 36
    
    return cpChars[checkCodePoint] === gstin.substring(14, 15)
  }

  /**
   * Generates a valid GSTIN check digit
   */
  static generateCheckDigit(partialGSTIN: string): string {
    if (partialGSTIN.length !== 14) {
      throw new GSTINValidationError('Partial GSTIN must be exactly 14 characters')
    }

    const factor = 2
    let sum = 0
    let checkCodePoint = 0
    const cpChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    for (let i = partialGSTIN.length - 1; i >= 0; i--) {
      const codePoint = cpChars.indexOf(partialGSTIN[i])
      if (codePoint === -1) {
        throw new GSTINValidationError(`Invalid character in GSTIN: ${partialGSTIN[i]}`)
      }
      
      let product = codePoint * factor
      
      if (product > 35) {
        product = Math.floor(product / 36) + (product % 36)
      }
      
      sum += product
    }

    checkCodePoint = (36 - (sum % 36)) % 36
    return cpChars[checkCodePoint]
  }
}

/**
 * Validates PAN number format
 */
export class PANValidator {
  static validate(pan: string): boolean {
    if (!pan || typeof pan !== 'string') {
      throw new GSTINValidationError('PAN must be a non-empty string')
    }

    const cleanPAN = pan.replace(/\s+/g, '').toUpperCase()

    try {
      PANSchema.parse(cleanPAN)
      return true
    } catch (error) {
      throw new GSTINValidationError('Invalid PAN format')
    }
  }

  /**
   * Extracts information from PAN
   */
  static extract(pan: string) {
    this.validate(pan)
    const cleanPAN = pan.replace(/\s+/g, '').toUpperCase()

    // PAN structure: AAAAA9999A
    // First 5: Name/surname code
    // Next 4: Numbers  
    // Last 1: Check digit

    const entityTypeMap: Record<string, string> = {
      'P': 'Individual',
      'C': 'Company', 
      'H': 'HUF',
      'F': 'Firm',
      'A': 'AOP/BOI',
      'T': 'AOP (Trust)',
      'B': 'BOI',
      'L': 'Local Authority',
      'J': 'Artificial Juridical Person',
      'G': 'Government'
    }

    return {
      pan: cleanPAN,
      entityType: entityTypeMap[cleanPAN[3]] || 'Unknown',
      isIndividual: cleanPAN[3] === 'P',
      isCompany: cleanPAN[3] === 'C'
    }
  }
}

/**
 * Validates HSN (Harmonized System of Nomenclature) codes
 */
export class HSNValidator {
  static validate(hsn: string): boolean {
    if (!hsn || typeof hsn !== 'string') {
      throw new GSTINValidationError('HSN must be a non-empty string')
    }

    const cleanHSN = hsn.replace(/\s+/g, '')

    try {
      HSNSchema.parse(cleanHSN)
      return true
    } catch (error) {
      throw new GSTINValidationError('Invalid HSN format')
    }
  }

  /**
   * Gets HSN chapter and description based on first 2 digits
   */
  static getChapterInfo(hsn: string): { chapter: string; description: string } {
    this.validate(hsn)
    
    const chapter = hsn.substring(0, 2)
    
    // Basic HSN chapter mapping (simplified)
    const chapterMap: Record<string, string> = {
      '01': 'Live Animals',
      '02': 'Meat and Edible Meat Offal', 
      '03': 'Fish and Crustaceans',
      '04': 'Dairy Produce; Birds\' Eggs; Natural Honey',
      '05': 'Products of Animal Origin',
      '06': 'Live Trees and Other Plants',
      '07': 'Edible Vegetables',
      '08': 'Edible Fruit and Nuts',
      '09': 'Coffee, Tea, Maté and Spices',
      '10': 'Cereals',
      '11': 'Products of the Milling Industry',
      '12': 'Oil Seeds and Oleaginous Fruits',
      '13': 'Lac; Gums, Resins',
      '14': 'Vegetable Plaiting Materials',
      '15': 'Animal or Vegetable Fats and Oils',
      '16': 'Preparations of Meat, Fish or Crustaceans',
      '17': 'Sugars and Sugar Confectionery',
      '18': 'Cocoa and Cocoa Preparations',
      '19': 'Preparations of Cereals, Flour, Starch or Milk',
      '20': 'Preparations of Vegetables, Fruit, Nuts',
      '21': 'Miscellaneous Edible Preparations',
      '22': 'Beverages, Spirits and Vinegar',
      '23': 'Residues and Waste from the Food Industries',
      '24': 'Tobacco and Manufactured Tobacco Substitutes',
      '25': 'Salt; Sulphur; Earths and Stone; Plastering Materials',
      // Add more as needed...
      '84': 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances',
      '85': 'Electrical Machinery and Equipment'
    }

    return {
      chapter,
      description: chapterMap[chapter] || 'Unknown Chapter'
    }
  }
}

/**
 * Validates SAC (Services Accounting Code) codes
 */
export class SACValidator {
  static validate(sac: string): boolean {
    if (!sac || typeof sac !== 'string') {
      throw new GSTINValidationError('SAC must be a non-empty string')
    }

    const cleanSAC = sac.replace(/\s+/g, '')

    try {
      SACSchema.parse(cleanSAC)
      return true
    } catch (error) {
      throw new GSTINValidationError('Invalid SAC format')
    }
  }

  /**
   * Gets SAC category information
   */
  static getCategoryInfo(sac: string): { category: string; description: string } {
    this.validate(sac)
    
    const category = sac.substring(0, 2)
    
    // Basic SAC category mapping
    const categoryMap: Record<string, string> = {
      '99': 'Services by way of other categories',
      '98': 'Telecommunication services',
      '97': 'Financial and related services',
      '96': 'Computer and related services',
      '95': 'Travel agency, tour operator services',
      '94': 'Sporting and other recreational services',
      '93': 'Maintenance and repair services',
      '92': 'Education services',
      '91': 'Health and social services',
      '90': 'Sewage and refuse disposal services'
    }

    return {
      category,
      description: categoryMap[category] || 'Unknown Category'
    }
  }
}

/**
 * Utility functions for general GST validation
 */
export class GSTUtils {
  /**
   * Validates if two states are the same for intra-state vs inter-state determination
   */
  static isIntraState(supplierState: string, customerState: string): boolean {
    return supplierState === customerState
  }

  /**
   * Gets state name from state code
   */
  static getStateName(stateCode: string): string {
    return GST_STATE_CODES[stateCode] || 'Unknown State'
  }

  /**
   * Validates state code
   */
  static isValidStateCode(stateCode: string): boolean {
    return !!GST_STATE_CODES[stateCode]
  }

  /**
   * Formats currency amount for GST returns
   */
  static formatAmount(amount: number): number {
    return Math.round(amount * 100) / 100
  }

  /**
   * Formats date for GST returns (DD-MM-YYYY)
   */
  static formatGSTDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  /**
   * Formats return period (MMYYYY)
   */
  static formatReturnPeriod(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}${year}`
  }

  /**
   * Validates return period format
   */
  static isValidReturnPeriod(period: string): boolean {
    return /^(0[1-9]|1[0-2])\d{4}$/.test(period)
  }
}