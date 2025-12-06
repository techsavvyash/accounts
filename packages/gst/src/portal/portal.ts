/**
 * GST Portal Integration Helpers
 *
 * This module provides helper functions to generate portal-ready
 * JSON files that can be directly uploaded to the GST portal.
 */

import { GSTReturnGenerator } from '../returns'
import { GSTR1Return, GSTR3BReturn } from '../core'

export interface PortalFileOptions {
  /**
   * Add pretty formatting to JSON (default: true)
   */
  pretty?: boolean

  /**
   * Validate before export (default: true)
   */
  validate?: boolean

  /**
   * Include metadata comments (default: false)
   * Note: GST portal ignores comments in JSON
   */
  includeMetadata?: boolean
}

export interface PortalFileResult {
  /**
   * The JSON string ready for upload
   */
  json: string

  /**
   * Suggested filename for the export
   */
  filename: string

  /**
   * File size in bytes
   */
  size: number

  /**
   * Validation result
   */
  validation?: {
    isValid: boolean
    errors: string[]
  }

  /**
   * Summary information
   */
  summary: Record<string, any>
}

/**
 * Portal Helper Class for GST Returns
 */
export class GSTPortalHelper {
  /**
   * Generate portal-ready GSTR-1 JSON file
   *
   * @param gstr1 - GSTR-1 return data
   * @param options - Export options
   * @returns Portal file result with JSON, filename, and metadata
   *
   * @example
   * ```typescript
   * const result = GSTPortalHelper.exportGSTR1ForPortal(gstr1)
   * fs.writeFileSync(result.filename, result.json)
   * console.log(`File size: ${result.size} bytes`)
   * ```
   */
  static exportGSTR1ForPortal(
    gstr1: GSTR1Return,
    options: PortalFileOptions = {}
  ): PortalFileResult {
    const { pretty = true, validate = true } = options

    // Validate if requested
    let validation: { isValid: boolean; errors: string[] } | undefined
    if (validate) {
      validation = GSTReturnGenerator.validateGSTR1(gstr1)
      if (!validation.isValid) {
        console.warn('GSTR-1 validation failed. File may be rejected by GST portal.')
      }
    }

    // Generate JSON
    const json = pretty
      ? JSON.stringify(gstr1, null, 2)
      : JSON.stringify(gstr1)

    // Generate filename
    const filename = `GSTR1_${gstr1.ret_period}_${gstr1.gstin}.json`

    // Calculate summary
    const summary = {
      gstin: gstr1.gstin,
      period: gstr1.ret_period,
      b2b_customers: gstr1.b2b.length,
      b2b_invoices: gstr1.b2b.reduce((sum, entry) => sum + entry.inv.length, 0),
      b2cl_invoices: gstr1.b2cl.reduce((sum, entry) => sum + entry.inv.length, 0),
      b2cs_entries: gstr1.b2cs.length,
      export_invoices: gstr1.exp.reduce((sum, entry) => sum + entry.inv.length, 0),
      hsn_codes: gstr1.hsn.length,
      cdnr_notes: gstr1.cdnr.reduce((sum, entry) => sum + entry.nt.length, 0),
      cdnur_notes: gstr1.cdnur.reduce((sum, entry) => sum + entry.nt.length, 0)
    }

    return {
      json,
      filename,
      size: Buffer.byteLength(json, 'utf8'),
      validation,
      summary
    }
  }

  /**
   * Generate portal-ready GSTR-3B JSON file
   *
   * @param gstr3b - GSTR-3B return data
   * @param options - Export options
   * @returns Portal file result with JSON, filename, and metadata
   *
   * @example
   * ```typescript
   * const result = GSTPortalHelper.exportGSTR3BForPortal(gstr3b)
   * fs.writeFileSync(result.filename, result.json)
   * ```
   */
  static exportGSTR3BForPortal(
    gstr3b: GSTR3BReturn,
    options: PortalFileOptions = {}
  ): PortalFileResult {
    const { pretty = true, validate = true } = options

    // Validate if requested
    let validation: { isValid: boolean; errors: string[] } | undefined
    if (validate) {
      validation = GSTReturnGenerator.validateGSTR3B(gstr3b)
      if (!validation.isValid) {
        console.warn('GSTR-3B validation failed. File may be rejected by GST portal.')
      }
    }

    // Generate JSON
    const json = pretty
      ? JSON.stringify(gstr3b, null, 2)
      : JSON.stringify(gstr3b)

    // Generate filename
    const filename = `GSTR3B_${gstr3b.ret_period}_${gstr3b.gstin}.json`

    // Calculate summary
    const summary = {
      gstin: gstr3b.gstin,
      period: gstr3b.ret_period,
      outward_taxable_value: gstr3b.sup_details.osup_det.txval,
      outward_igst: gstr3b.sup_details.osup_det.iamt,
      outward_cgst: gstr3b.sup_details.osup_det.camt,
      outward_sgst: gstr3b.sup_details.osup_det.samt,
      itc_available_igst: gstr3b.itc_elg.itc_avl[0]?.iamt || 0,
      itc_available_cgst: gstr3b.itc_elg.itc_avl[0]?.camt || 0,
      itc_available_sgst: gstr3b.itc_elg.itc_avl[0]?.samt || 0,
      net_itc_igst: gstr3b.itc_elg.itc_net.iamt,
      net_itc_cgst: gstr3b.itc_elg.itc_net.camt,
      net_itc_sgst: gstr3b.itc_elg.itc_net.samt
    }

    return {
      json,
      filename,
      size: Buffer.byteLength(json, 'utf8'),
      validation,
      summary
    }
  }

  /**
   * Print upload instructions for GST portal
   *
   * @param returnType - Type of return ('GSTR-1' or 'GSTR-3B')
   */
  static printUploadInstructions(returnType: 'GSTR-1' | 'GSTR-3B'): void {
    console.log(`\n=== How to Upload ${returnType} to GST Portal ===\n`)

    console.log('Step 1: Login to GST Portal')
    console.log('  - Visit: https://www.gst.gov.in/')
    console.log('  - Login with your credentials\n')

    console.log('Step 2: Navigate to Returns')
    console.log('  - Go to: Services > Returns > Returns Dashboard')
    console.log('  - Select the relevant Financial Year and Tax Period\n')

    console.log(`Step 3: Select ${returnType}`)
    console.log(`  - Click on "${returnType}" tile`)
    console.log('  - Click on "PREPARE OFFLINE" button\n')

    console.log('Step 4: Upload JSON File')
    console.log('  - Click on "UPLOAD" tab')
    console.log('  - Click "CHOOSE FILE" button')
    console.log('  - Select the generated JSON file')
    console.log('  - Click "UPLOAD" button\n')

    console.log('Step 5: Verify Data')
    console.log('  - Review the uploaded data in online form')
    console.log('  - Check all sections for accuracy')
    console.log('  - Make corrections if needed\n')

    if (returnType === 'GSTR-3B') {
      console.log('Step 6: Pay Tax Liability')
      console.log('  - Calculate net tax payable')
      console.log('  - Make payment via PMT-06 challan')
      console.log('  - Ensure sufficient balance in electronic ledgers\n')
    }

    console.log('Step 6: File Return')
    console.log('  - Click "SUBMIT" button')
    console.log('  - Verify using DSC or EVC')
    console.log('  - Download filed return acknowledgment\n')

    console.log('Important Notes:')
    if (returnType === 'GSTR-1') {
      console.log('  - Due Date: 11th of next month (monthly filers)')
      console.log('  - Due Date: 13th of month following quarter (quarterly filers)')
    } else {
      console.log('  - Due Date: 20th of next month')
      console.log('  - Tax payment must be completed before filing')
    }
    console.log('  - Late filing attracts late fees and interest')
    console.log('  - Keep acknowledgment for your records\n')
  }

  /**
   * Validate portal JSON file size
   *
   * GST portal has file size limitations. This helper checks if the file
   * is within acceptable limits.
   *
   * @param fileSize - Size in bytes
   * @returns Validation result
   */
  static validateFileSize(fileSize: number): {
    isValid: boolean
    sizeInMB: number
    message: string
  } {
    const maxSizeBytes = 5 * 1024 * 1024 // 5 MB (typical portal limit)
    const sizeInMB = fileSize / (1024 * 1024)

    if (fileSize > maxSizeBytes) {
      return {
        isValid: false,
        sizeInMB,
        message: `File size (${sizeInMB.toFixed(2)} MB) exceeds portal limit of 5 MB. Consider splitting the data.`
      }
    }

    return {
      isValid: true,
      sizeInMB,
      message: `File size (${sizeInMB.toFixed(2)} MB) is within acceptable limits.`
    }
  }

  /**
   * Generate a complete portal upload package
   *
   * Creates both GSTR-1 and GSTR-3B files with validation and summary
   *
   * @param gstr1 - GSTR-1 return data
   * @param gstr3b - GSTR-3B return data
   * @returns Package with both returns
   */
  static generatePortalPackage(
    gstr1: GSTR1Return,
    gstr3b: GSTR3BReturn
  ): {
    gstr1: PortalFileResult
    gstr3b: PortalFileResult
    packageSummary: {
      period: string
      gstin: string
      totalFiles: number
      totalSize: number
      allValid: boolean
    }
  } {
    const gstr1Result = this.exportGSTR1ForPortal(gstr1)
    const gstr3bResult = this.exportGSTR3BForPortal(gstr3b)

    const allValid =
      (gstr1Result.validation?.isValid ?? true) &&
      (gstr3bResult.validation?.isValid ?? true)

    return {
      gstr1: gstr1Result,
      gstr3b: gstr3bResult,
      packageSummary: {
        period: gstr1.ret_period,
        gstin: gstr1.gstin,
        totalFiles: 2,
        totalSize: gstr1Result.size + gstr3bResult.size,
        allValid
      }
    }
  }
}

// Re-export for convenience
export { GSTReturnGenerator } from '../returns'
