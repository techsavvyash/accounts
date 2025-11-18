/**
 * Tests for E-Way Bill Utilities
 */

import { describe, test, expect } from 'bun:test'
import { EWayBillUtils } from '../src/utils'

describe('EWayBillUtils', () => {
  describe('validateGSTIN', () => {
    test('should validate correct GSTIN', () => {
      expect(EWayBillUtils.validateGSTIN('27AAPFU0939F1ZV')).toBe(true)
      expect(EWayBillUtils.validateGSTIN('29BBBBB1234C1Z5')).toBe(true)
    })

    test('should reject invalid GSTIN', () => {
      expect(EWayBillUtils.validateGSTIN('')).toBe(false)
      expect(EWayBillUtils.validateGSTIN('INVALID')).toBe(false)
      expect(EWayBillUtils.validateGSTIN('27AAPFU0939F1')).toBe(false) // Too short
      expect(EWayBillUtils.validateGSTIN('27AAPFU0939F1ZVX')).toBe(false) // Too long
    })
  })

  describe('validatePincode', () => {
    test('should validate correct pincode', () => {
      expect(EWayBillUtils.validatePincode(400001)).toBe(true)
      expect(EWayBillUtils.validatePincode(560001)).toBe(true)
      expect(EWayBillUtils.validatePincode(110001)).toBe(true)
    })

    test('should reject invalid pincode', () => {
      expect(EWayBillUtils.validatePincode(0)).toBe(false)
      expect(EWayBillUtils.validatePincode(99999)).toBe(false) // Too short
      expect(EWayBillUtils.validatePincode(1000000)).toBe(false) // Too long
    })
  })

  describe('validateHSN', () => {
    test('should validate correct HSN codes', () => {
      expect(EWayBillUtils.validateHSN(84)).toBe(true) // 2 digits
      expect(EWayBillUtils.validateHSN(8471)).toBe(true) // 4 digits
      expect(EWayBillUtils.validateHSN(847130)).toBe(true) // 6 digits
      expect(EWayBillUtils.validateHSN(84713000)).toBe(true) // 8 digits
    })

    test('should reject invalid HSN codes', () => {
      expect(EWayBillUtils.validateHSN(0)).toBe(false)
      expect(EWayBillUtils.validateHSN(1)).toBe(false) // 1 digit not allowed
      expect(EWayBillUtils.validateHSN(123)).toBe(false) // 3 digits not allowed
      expect(EWayBillUtils.validateHSN(12345)).toBe(false) // 5 digits not allowed
    })
  })

  describe('validateStateCode', () => {
    test('should validate correct state codes', () => {
      expect(EWayBillUtils.validateStateCode(1)).toBe(true)
      expect(EWayBillUtils.validateStateCode(27)).toBe(true)
      expect(EWayBillUtils.validateStateCode(38)).toBe(true)
    })

    test('should reject invalid state codes', () => {
      expect(EWayBillUtils.validateStateCode(0)).toBe(false)
      expect(EWayBillUtils.validateStateCode(39)).toBe(false)
      expect(EWayBillUtils.validateStateCode(100)).toBe(false)
    })
  })

  describe('formatDate', () => {
    test('should format date to DD/MM/YYYY', () => {
      const date = new Date('2024-11-15')
      expect(EWayBillUtils.formatDate(date)).toBe('15/11/2024')
    })

    test('should handle string dates', () => {
      expect(EWayBillUtils.formatDate('2024-11-15')).toBe('15/11/2024')
    })

    test('should throw error for invalid date', () => {
      expect(() => EWayBillUtils.formatDate('invalid')).toThrow()
    })
  })

  describe('parseDate', () => {
    test('should parse DD/MM/YYYY to Date', () => {
      const date = EWayBillUtils.parseDate('15/11/2024')
      expect(date.getDate()).toBe(15)
      expect(date.getMonth()).toBe(10) // 0-indexed
      expect(date.getFullYear()).toBe(2024)
    })

    test('should throw error for invalid format', () => {
      expect(() => EWayBillUtils.parseDate('2024-11-15')).toThrow()
      expect(() => EWayBillUtils.parseDate('invalid')).toThrow()
    })
  })

  describe('calculateValidity', () => {
    test('should calculate validity for normal cargo', () => {
      expect(EWayBillUtils.calculateValidity(100, false)).toBe(1) // < 200km = 1 day
      expect(EWayBillUtils.calculateValidity(200, false)).toBe(1) // 200km = 1 day
      expect(EWayBillUtils.calculateValidity(250, false)).toBe(2) // 250km = 2 days
      expect(EWayBillUtils.calculateValidity(800, false)).toBe(4) // 800km = 4 days
    })

    test('should calculate validity for ODC', () => {
      expect(EWayBillUtils.calculateValidity(20, true)).toBe(1) // 20km = 1 day
      expect(EWayBillUtils.calculateValidity(50, true)).toBe(3) // 50km = 3 days
      expect(EWayBillUtils.calculateValidity(100, true)).toBe(5) // 100km = 5 days
    })

    test('should return 1 day for zero or negative distance', () => {
      expect(EWayBillUtils.calculateValidity(0, false)).toBe(1)
      expect(EWayBillUtils.calculateValidity(-10, false)).toBe(1)
    })
  })

  describe('validateVehicleNumber', () => {
    test('should validate correct vehicle numbers', () => {
      expect(EWayBillUtils.validateVehicleNumber('MH01AB1234')).toBe(true)
      expect(EWayBillUtils.validateVehicleNumber('DL7CAB9876')).toBe(true)
      expect(EWayBillUtils.validateVehicleNumber('KA05MH5678')).toBe(true)
      expect(EWayBillUtils.validateVehicleNumber('mh01ab1234')).toBe(true) // lowercase
    })

    test('should reject invalid vehicle numbers', () => {
      expect(EWayBillUtils.validateVehicleNumber('')).toBe(false)
      expect(EWayBillUtils.validateVehicleNumber('INVALID')).toBe(false)
      expect(EWayBillUtils.validateVehicleNumber('MH01AB12345')).toBe(false) // Too many digits
    })
  })

  describe('formatVehicleNumber', () => {
    test('should format vehicle number', () => {
      expect(EWayBillUtils.formatVehicleNumber('mh 01 ab 1234')).toBe('MH01AB1234')
      expect(EWayBillUtils.formatVehicleNumber('  mh01ab1234  ')).toBe('MH01AB1234')
    })
  })

  describe('calculateTotalInvoiceValue', () => {
    test('should calculate total with IGST', () => {
      const total = EWayBillUtils.calculateTotalInvoiceValue(
        100000, // taxable
        0,      // cgst
        0,      // sgst
        18000,  // igst
        0,      // cess
        0       // other
      )
      expect(total).toBe(118000)
    })

    test('should calculate total with CGST/SGST', () => {
      const total = EWayBillUtils.calculateTotalInvoiceValue(
        100000, // taxable
        9000,   // cgst
        9000,   // sgst
        0,      // igst
        0,      // cess
        0       // other
      )
      expect(total).toBe(118000)
    })

    test('should include cess and other values', () => {
      const total = EWayBillUtils.calculateTotalInvoiceValue(
        100000, // taxable
        9000,   // cgst
        9000,   // sgst
        0,      // igst
        1000,   // cess
        500     // other
      )
      expect(total).toBe(119500)
    })
  })

  describe('getStateName', () => {
    test('should return correct state names', () => {
      expect(EWayBillUtils.getStateName(27)).toBe('Maharashtra')
      expect(EWayBillUtils.getStateName(29)).toBe('Karnataka')
      expect(EWayBillUtils.getStateName(7)).toBe('Delhi')
    })

    test('should return Unknown for invalid codes', () => {
      expect(EWayBillUtils.getStateName(99)).toBe('Unknown')
    })
  })

  describe('isValidQuantityUnit', () => {
    test('should validate correct units', () => {
      expect(EWayBillUtils.isValidQuantityUnit('NOS')).toBe(true)
      expect(EWayBillUtils.isValidQuantityUnit('KGS')).toBe(true)
      expect(EWayBillUtils.isValidQuantityUnit('MTR')).toBe(true)
      expect(EWayBillUtils.isValidQuantityUnit('nos')).toBe(true) // lowercase
    })

    test('should reject invalid units', () => {
      expect(EWayBillUtils.isValidQuantityUnit('INVALID')).toBe(false)
      expect(EWayBillUtils.isValidQuantityUnit('')).toBe(false)
    })
  })

  describe('round', () => {
    test('should round to 2 decimal places', () => {
      expect(EWayBillUtils.round(123.456)).toBe(123.46)
      expect(EWayBillUtils.round(123.454)).toBe(123.45)
      expect(EWayBillUtils.round(123.5)).toBe(123.5)
    })
  })
})
