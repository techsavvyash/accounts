/**
 * Base GST Error class
 */
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

/**
 * GSTIN validation error
 */
export class GSTINValidationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'GSTIN_VALIDATION_ERROR', details)
  }
}

/**
 * Tax calculation error
 */
export class TaxCalculationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'TAX_CALCULATION_ERROR', details)
  }
}

/**
 * Return generation error
 */
export class ReturnGenerationError extends GSTError {
  constructor(message: string, details?: any) {
    super(message, 'RETURN_GENERATION_ERROR', details)
  }
}
