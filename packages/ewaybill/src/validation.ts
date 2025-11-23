/**
 * E-Way Bill Validation Module
 * Comprehensive validation for E-Way Bill data
 */

import {
  GenerateEWayBillRequest,
  UpdateTransportDetailsRequest,
  CancelEWayBillRequest,
  ExtendValidityRequest,
  ValidationError,
  DocumentType
} from './types'
import { EWayBillUtils } from './utils'

export class EWayBillValidator {
  /**
   * Validate E-Way Bill generation request
   */
  static validateGenerateRequest(request: GenerateEWayBillRequest): void {
    const errors: string[] = []

    // Validate document details
    if (!request.docNo || !EWayBillUtils.validateDocumentNumber(request.docNo)) {
      errors.push('Invalid document number')
    }

    if (!request.docDate) {
      errors.push('Document date is required')
    }

    // Validate supplier/from details
    if (!EWayBillUtils.validateGSTIN(request.fromGstin)) {
      errors.push('Invalid supplier GSTIN')
    }

    if (!request.fromTrdName || request.fromTrdName.trim().length === 0) {
      errors.push('Supplier name is required')
    }

    if (!request.fromAddr1 || request.fromAddr1.trim().length === 0) {
      errors.push('Supplier address is required')
    }

    if (!request.fromPlace || request.fromPlace.trim().length === 0) {
      errors.push('Supplier place is required')
    }

    if (!EWayBillUtils.validatePincode(request.fromPincode)) {
      errors.push('Invalid supplier pincode')
    }

    if (!EWayBillUtils.validateStateCode(request.fromStateCode)) {
      errors.push('Invalid supplier state code')
    }

    // Validate recipient/to details
    if (request.toGstin && !EWayBillUtils.validateGSTIN(request.toGstin)) {
      errors.push('Invalid recipient GSTIN')
    }

    if (!request.toTrdName || request.toTrdName.trim().length === 0) {
      errors.push('Recipient name is required')
    }

    if (!request.toAddr1 || request.toAddr1.trim().length === 0) {
      errors.push('Recipient address is required')
    }

    if (!request.toPlace || request.toPlace.trim().length === 0) {
      errors.push('Recipient place is required')
    }

    if (!EWayBillUtils.validatePincode(request.toPincode)) {
      errors.push('Invalid recipient pincode')
    }

    if (!EWayBillUtils.validateStateCode(request.toStateCode)) {
      errors.push('Invalid recipient state code')
    }

    // Validate value details
    if (!request.totalValue || request.totalValue <= 0) {
      errors.push('Total value must be greater than 0')
    }

    if (!request.totInvValue || request.totInvValue <= 0) {
      errors.push('Total invoice value must be greater than 0')
    }

    // Validate items
    if (!request.itemList || request.itemList.length === 0) {
      errors.push('At least one item is required')
    } else {
      request.itemList.forEach((item, index) => {
        if (!item.productName || item.productName.trim().length === 0) {
          errors.push(`Item ${index + 1}: Product name is required`)
        }

        if (!EWayBillUtils.validateHSN(item.hsnCode)) {
          errors.push(`Item ${index + 1}: Invalid HSN code`)
        }

        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
        }

        if (!item.qtyUnit || !EWayBillUtils.isValidQuantityUnit(item.qtyUnit)) {
          errors.push(`Item ${index + 1}: Invalid quantity unit`)
        }

        if (!item.taxableAmount || item.taxableAmount <= 0) {
          errors.push(`Item ${index + 1}: Taxable amount must be greater than 0`)
        }
      })
    }

    // Validate transport details if provided
    if (request.vehicleNo && !EWayBillUtils.validateVehicleNumber(request.vehicleNo)) {
      errors.push('Invalid vehicle number format')
    }

    // Validate transporter GSTIN if provided
    if (request.transporterId && !EWayBillUtils.validateGSTIN(request.transporterId)) {
      errors.push('Invalid transporter GSTIN')
    }

    // Validate document date is not in future
    try {
      const docDate = EWayBillUtils.parseDate(request.docDate)
      if (docDate > new Date()) {
        errors.push('Document date cannot be in future')
      }

      // Validate document date is not more than 180 days old (new 2025 rule)
      const daysDiff = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff > 180) {
        errors.push('Document date cannot be more than 180 days old')
      }
    } catch (e) {
      errors.push('Invalid document date format. Expected DD/MM/YYYY')
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `E-Way Bill generation validation failed: ${errors.join(', ')}`,
        { errors }
      )
    }
  }

  /**
   * Validate update transport details request
   */
  static validateUpdateRequest(request: UpdateTransportDetailsRequest): void {
    const errors: string[] = []

    if (!request.ewbNo || request.ewbNo <= 0) {
      errors.push('Invalid E-Way Bill number')
    }

    if (request.vehicleNo && !EWayBillUtils.validateVehicleNumber(request.vehicleNo)) {
      errors.push('Invalid vehicle number format')
    }

    if (request.fromState && !EWayBillUtils.validateStateCode(request.fromState)) {
      errors.push('Invalid state code')
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Update transport details validation failed: ${errors.join(', ')}`,
        { errors }
      )
    }
  }

  /**
   * Validate cancel E-Way Bill request
   */
  static validateCancelRequest(request: CancelEWayBillRequest): void {
    const errors: string[] = []

    if (!request.ewbNo || request.ewbNo <= 0) {
      errors.push('Invalid E-Way Bill number')
    }

    if (!request.cancelRsnCode || request.cancelRsnCode < 1 || request.cancelRsnCode > 4) {
      errors.push('Invalid cancel reason code (must be 1-4)')
    }

    if (!request.cancelRmrk || request.cancelRmrk.trim().length === 0) {
      errors.push('Cancel remarks are required')
    }

    if (request.cancelRmrk && request.cancelRmrk.length > 50) {
      errors.push('Cancel remarks cannot exceed 50 characters')
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Cancel E-Way Bill validation failed: ${errors.join(', ')}`,
        { errors }
      )
    }
  }

  /**
   * Validate extend validity request
   */
  static validateExtendRequest(request: ExtendValidityRequest): void {
    const errors: string[] = []

    if (!request.ewbNo || request.ewbNo <= 0) {
      errors.push('Invalid E-Way Bill number')
    }

    if (!request.vehicleNo || !EWayBillUtils.validateVehicleNumber(request.vehicleNo)) {
      errors.push('Invalid vehicle number')
    }

    if (!request.fromPlace || request.fromPlace.trim().length === 0) {
      errors.push('From place is required')
    }

    if (!EWayBillUtils.validateStateCode(request.fromState)) {
      errors.push('Invalid state code')
    }

    if (!request.remainingDistance || request.remainingDistance <= 0) {
      errors.push('Remaining distance must be greater than 0')
    }

    if (!request.extnRsnCode || request.extnRsnCode < 1 || request.extnRsnCode > 5) {
      errors.push('Invalid extension reason code (must be 1-5)')
    }

    if (!request.extnRemarks || request.extnRemarks.trim().length === 0) {
      errors.push('Extension remarks are required')
    }

    if (request.extnRemarks && request.extnRemarks.length > 50) {
      errors.push('Extension remarks cannot exceed 50 characters')
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Extend validity validation failed: ${errors.join(', ')}`,
        { errors }
      )
    }
  }

  /**
   * Validate E-Way Bill number
   */
  static validateEWayBillNumber(ewbNo: number): void {
    if (!ewbNo || typeof ewbNo !== 'number' || ewbNo <= 0) {
      throw new ValidationError('Invalid E-Way Bill number')
    }

    // E-Way Bill number is typically 12 digits
    const ewbStr = ewbNo.toString()
    if (ewbStr.length !== 12) {
      throw new ValidationError('E-Way Bill number must be 12 digits')
    }
  }
}
