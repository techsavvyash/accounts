/**
 * Tests for E-Way Bill Validation
 */

import { describe, test, expect } from 'bun:test'
import { EWayBillValidator } from '../src/validation'
import {
  GenerateEWayBillRequest,
  SupplyType,
  SubSupplyType,
  DocumentType,
  TransactionType,
  ValidationError
} from '../src/types'

describe('EWayBillValidator', () => {
  const validGenerateRequest: GenerateEWayBillRequest = {
    supplyType: SupplyType.OUTWARD,
    subSupplyType: SubSupplyType.SUPPLY,
    docType: DocumentType.TAX_INVOICE,
    docNo: 'INV-001',
    docDate: '15/11/2024',

    fromGstin: '27AAPFU0939F1ZV',
    fromTrdName: 'ABC Corporation',
    fromAddr1: 'Plot 123',
    fromPlace: 'Mumbai',
    fromPincode: 400001,
    fromStateCode: 27,

    toGstin: '29BBBBB1234C1Z5',
    toTrdName: 'XYZ Limited',
    toAddr1: '456 MG Road',
    toPlace: 'Bangalore',
    toPincode: 560001,
    toStateCode: 29,

    transactionType: TransactionType.REGULAR,
    totalValue: 100000,
    igstValue: 18000,
    totInvValue: 118000,

    itemList: [
      {
        productName: 'Laptop',
        hsnCode: 84713000,
        quantity: 10,
        qtyUnit: 'NOS',
        igstRate: 18,
        taxableAmount: 100000
      }
    ]
  }

  describe('validateGenerateRequest', () => {
    test('should validate correct request', () => {
      expect(() => {
        EWayBillValidator.validateGenerateRequest(validGenerateRequest)
      }).not.toThrow()
    })

    test('should reject invalid supplier GSTIN', () => {
      const request = { ...validGenerateRequest, fromGstin: 'INVALID' }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject missing supplier name', () => {
      const request = { ...validGenerateRequest, fromTrdName: '' }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject invalid supplier pincode', () => {
      const request = { ...validGenerateRequest, fromPincode: 12345 }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject invalid recipient GSTIN', () => {
      const request = { ...validGenerateRequest, toGstin: 'INVALID' }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject zero total value', () => {
      const request = { ...validGenerateRequest, totalValue: 0 }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject empty item list', () => {
      const request = { ...validGenerateRequest, itemList: [] }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject item with invalid HSN', () => {
      const request = {
        ...validGenerateRequest,
        itemList: [
          {
            productName: 'Laptop',
            hsnCode: 123, // 3 digits not allowed
            quantity: 10,
            qtyUnit: 'NOS',
            igstRate: 18,
            taxableAmount: 100000
          }
        ]
      }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject item with invalid quantity unit', () => {
      const request = {
        ...validGenerateRequest,
        itemList: [
          {
            productName: 'Laptop',
            hsnCode: 84713000,
            quantity: 10,
            qtyUnit: 'INVALID',
            igstRate: 18,
            taxableAmount: 100000
          }
        ]
      }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })

    test('should reject invalid vehicle number', () => {
      const request = { ...validGenerateRequest, vehicleNo: 'INVALID' }
      expect(() => {
        EWayBillValidator.validateGenerateRequest(request)
      }).toThrow(ValidationError)
    })
  })

  describe('validateUpdateRequest', () => {
    test('should validate correct update request', () => {
      expect(() => {
        EWayBillValidator.validateUpdateRequest({
          ewbNo: 123456789012,
          vehicleNo: 'MH01AB1234',
          fromPlace: 'Mumbai',
          fromState: 27
        })
      }).not.toThrow()
    })

    test('should reject invalid E-Way Bill number', () => {
      expect(() => {
        EWayBillValidator.validateUpdateRequest({
          ewbNo: 0,
          vehicleNo: 'MH01AB1234'
        })
      }).toThrow(ValidationError)
    })

    test('should reject invalid vehicle number', () => {
      expect(() => {
        EWayBillValidator.validateUpdateRequest({
          ewbNo: 123456789012,
          vehicleNo: 'INVALID'
        })
      }).toThrow(ValidationError)
    })
  })

  describe('validateCancelRequest', () => {
    test('should validate correct cancel request', () => {
      expect(() => {
        EWayBillValidator.validateCancelRequest({
          ewbNo: 123456789012,
          cancelRsnCode: 2,
          cancelRmrk: 'Data entry mistake'
        })
      }).not.toThrow()
    })

    test('should reject invalid E-Way Bill number', () => {
      expect(() => {
        EWayBillValidator.validateCancelRequest({
          ewbNo: 0,
          cancelRsnCode: 2,
          cancelRmrk: 'Data entry mistake'
        })
      }).toThrow(ValidationError)
    })

    test('should reject invalid cancel reason code', () => {
      expect(() => {
        EWayBillValidator.validateCancelRequest({
          ewbNo: 123456789012,
          cancelRsnCode: 10,
          cancelRmrk: 'Data entry mistake'
        })
      }).toThrow(ValidationError)
    })

    test('should reject empty cancel remarks', () => {
      expect(() => {
        EWayBillValidator.validateCancelRequest({
          ewbNo: 123456789012,
          cancelRsnCode: 2,
          cancelRmrk: ''
        })
      }).toThrow(ValidationError)
    })
  })

  describe('validateExtendRequest', () => {
    test('should validate correct extend request', () => {
      expect(() => {
        EWayBillValidator.validateExtendRequest({
          ewbNo: 123456789012,
          vehicleNo: 'MH01AB1234',
          fromPlace: 'Pune',
          fromState: 27,
          remainingDistance: 200,
          extnRsnCode: 4,
          extnRemarks: 'Vehicle breakdown'
        })
      }).not.toThrow()
    })

    test('should reject invalid E-Way Bill number', () => {
      expect(() => {
        EWayBillValidator.validateExtendRequest({
          ewbNo: 0,
          vehicleNo: 'MH01AB1234',
          fromPlace: 'Pune',
          fromState: 27,
          remainingDistance: 200,
          extnRsnCode: 4,
          extnRemarks: 'Vehicle breakdown'
        })
      }).toThrow(ValidationError)
    })

    test('should reject zero remaining distance', () => {
      expect(() => {
        EWayBillValidator.validateExtendRequest({
          ewbNo: 123456789012,
          vehicleNo: 'MH01AB1234',
          fromPlace: 'Pune',
          fromState: 27,
          remainingDistance: 0,
          extnRsnCode: 4,
          extnRemarks: 'Vehicle breakdown'
        })
      }).toThrow(ValidationError)
    })
  })

  describe('validateEWayBillNumber', () => {
    test('should validate 12-digit E-Way Bill number', () => {
      expect(() => {
        EWayBillValidator.validateEWayBillNumber(123456789012)
      }).not.toThrow()
    })

    test('should reject invalid E-Way Bill numbers', () => {
      expect(() => {
        EWayBillValidator.validateEWayBillNumber(0)
      }).toThrow(ValidationError)

      expect(() => {
        EWayBillValidator.validateEWayBillNumber(123) // Too short
      }).toThrow(ValidationError)

      expect(() => {
        EWayBillValidator.validateEWayBillNumber(1234567890123) // Too long
      }).toThrow(ValidationError)
    })
  })
})
