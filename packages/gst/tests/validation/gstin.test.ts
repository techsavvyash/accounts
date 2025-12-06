import { describe, test, expect } from 'bun:test'
import { GSTINValidator } from '../../src/validation'
import { GSTINValidationError } from '../../src/core'

describe('GSTINValidator', () => {
  describe('validate()', () => {
    describe('Valid GSTINs', () => {
      const validGSTINs = [
        '27AAPFU0939F1ZV', // Maharashtra
        '29AABCT1332L1Z5', // Karnataka
        '07AAGFF2194N1Z1', // Delhi
        '24AAKCS9119K1Z1', // Gujarat
        '33AACCM9093R1ZP', // Tamil Nadu
        '09AAACR5055K1Z4', // Uttar Pradesh
        '19AAACG2562Q1ZY', // West Bengal
        '36AAACW3775F000', // Telangana
      ]

      test.each(validGSTINs)('should validate %s', (gstin) => {
        expect(GSTINValidator.validate(gstin)).toBe(true)
      })

      test('should validate GSTIN with spaces', () => {
        expect(GSTINValidator.validate('27 AAPFU 0939 F1Z V')).toBe(true)
      })

      test('should validate lowercase GSTIN', () => {
        expect(GSTINValidator.validate('27aapfu0939f1zv')).toBe(true)
      })
    })

    describe('Invalid GSTINs', () => {
      test('should reject null/undefined', () => {
        expect(() => GSTINValidator.validate(null as any)).toThrow(GSTINValidationError)
        expect(() => GSTINValidator.validate(undefined as any)).toThrow(GSTINValidationError)
      })

      test('should reject non-string input', () => {
        expect(() => GSTINValidator.validate(123 as any)).toThrow(GSTINValidationError)
        expect(() => GSTINValidator.validate({} as any)).toThrow(GSTINValidationError)
      })

      test('should reject empty string', () => {
        expect(() => GSTINValidator.validate('')).toThrow(GSTINValidationError)
        expect(() => GSTINValidator.validate('   ')).toThrow(GSTINValidationError)
      })

      test('should reject invalid length', () => {
        expect(() => GSTINValidator.validate('27AAPFU0939')).toThrow('GSTIN must be exactly 15 characters long')
        expect(() => GSTINValidator.validate('27AAPFU0939F1ZVEXTRA')).toThrow('GSTIN must be exactly 15 characters long')
      })

      test('should reject invalid format', () => {
        expect(() => GSTINValidator.validate('XYZABC1234567890')).toThrow('GSTIN format is invalid')
        expect(() => GSTINValidator.validate('12XAPFU0939F1ZV')).toThrow('GSTIN format is invalid') // Invalid PAN part
        expect(() => GSTINValidator.validate('27AAPFU0939F1XX')).toThrow('GSTIN format is invalid') // Missing 'Z'
      })

      test('should reject invalid state code', () => {
        expect(() => GSTINValidator.validate('00AAPFU0939F1ZV')).toThrow('Invalid state code: 00')
        expect(() => GSTINValidator.validate('99AAPFU0939F1ZV')).toThrow('Invalid state code: 99')
        expect(() => GSTINValidator.validate('40AAPFU0939F1ZV')).toThrow('Invalid state code: 40')
      })

      test('should reject invalid PAN', () => {
        expect(() => GSTINValidator.validate('27AAPF00939F1ZV')).toThrow('Invalid PAN embedded in GSTIN')
        expect(() => GSTINValidator.validate('2712345678901ZV')).toThrow('Invalid PAN embedded in GSTIN')
      })

      test('should reject invalid entity number', () => {
        expect(() => GSTINValidator.validate('27AAPFU09390  1ZV')).toThrow('Invalid entity number in GSTIN')
      })

      test('should reject invalid checksum', () => {
        expect(() => GSTINValidator.validate('27AAPFU0939F1ZA')).toThrow('GSTIN checksum validation failed')
        expect(() => GSTINValidator.validate('27AAPFU0939F1Z0')).toThrow('GSTIN checksum validation failed')
      })
    })

    describe('Edge Cases', () => {
      test('should handle all valid state codes', () => {
        const stateCodes = [
          '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
          '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
          '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
          '31', '32', '33', '34', '35', '36', '37', '38'
        ]

        stateCodes.forEach(code => {
          const gstin = `${code}AAPFU0939F1ZV`
          // Note: This might fail checksum, but should not fail on state code
          try {
            GSTINValidator.validate(gstin)
          } catch (e: any) {
            expect(e.message).not.toContain('Invalid state code')
          }
        })
      })

      test('should handle entity numbers 1-9 and A-Z', () => {
        const validEntities = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'Z']
        validEntities.forEach(entity => {
          const gstin = `27AAPFU0939F${entity}ZV`
          // Should not fail on entity number validation (might fail checksum)
          try {
            GSTINValidator.validate(gstin)
          } catch (e: any) {
            expect(e.message).not.toContain('Invalid entity number')
          }
        })
      })
    })
  })

  describe('extract()', () => {
    test('should extract components from valid GSTIN', () => {
      const result = GSTINValidator.extract('27AAPFU0939F1ZV')

      expect(result.gstin).toBe('27AAPFU0939F1ZV')
      expect(result.stateCode).toBe('27')
      expect(result.stateName).toBe('Maharashtra')
      expect(result.pan).toBe('AAPFU0939F')
      expect(result.entityNumber).toBe('1')
      expect(result.checkDigit).toBe('V')
    })

    test('should normalize GSTIN before extraction', () => {
      const result1 = GSTINValidator.extract('27aapfu0939f1zv')
      const result2 = GSTINValidator.extract('27 AAPFU 0939 F1Z V')

      expect(result1.gstin).toBe('27AAPFU0939F1ZV')
      expect(result2.gstin).toBe('27AAPFU0939F1ZV')
    })

    test('should extract from different states', () => {
      const testCases = [
        { gstin: '07AAGFF2194N1Z1', state: 'Delhi', code: '07' },
        { gstin: '29AABCT1332L1Z5', state: 'Karnataka', code: '29' },
        { gstin: '33AACCM9093R1ZP', state: 'Tamil Nadu', code: '33' },
      ]

      testCases.forEach(({ gstin, state, code }) => {
        const result = GSTINValidator.extract(gstin)
        expect(result.stateCode).toBe(code)
        expect(result.stateName).toBe(state)
      })
    })

    test('should throw on invalid GSTIN', () => {
      expect(() => GSTINValidator.extract('INVALID')).toThrow(GSTINValidationError)
      expect(() => GSTINValidator.extract('27AAPFU0939F1ZA')).toThrow(GSTINValidationError)
    })
  })

  describe('generateCheckDigit()', () => {
    test('should generate correct check digit', () => {
      const checkDigit = GSTINValidator.generateCheckDigit('27AAPFU0939F1Z')
      expect(checkDigit).toBe('V')
    })

    test('should generate check digit for different GSTINs', () => {
      const testCases = [
        { base: '27AAPFU0939F1Z', expected: 'V' },
        { base: '29AABCT1332L1Z', expected: '5' },
        { base: '07AAGFF2194N1Z', expected: '1' },
      ]

      testCases.forEach(({ base, expected }) => {
        expect(GSTINValidator.generateCheckDigit(base)).toBe(expected)
      })
    })
  })

  describe('Integration Tests', () => {
    test('should validate-extract-generate cycle', () => {
      const gstin = '27AAPFU0939F1ZV'

      // Validate
      expect(GSTINValidator.validate(gstin)).toBe(true)

      // Extract
      const extracted = GSTINValidator.extract(gstin)
      expect(extracted.gstin).toBe(gstin)

      // Generate check digit from base
      const base = gstin.substring(0, 14)
      const checkDigit = GSTINValidator.generateCheckDigit(base)
      expect(checkDigit).toBe(extracted.checkDigit)
    })

    test('should handle batch validation', () => {
      const gstins = [
        '27AAPFU0939F1ZV',
        '29AABCT1332L1Z5',
        '07AAGFF2194N1Z1',
        '24AAKCS9119K1Z1',
        '33AACCM9093R1ZP',
      ]

      const results = gstins.map(g => {
        try {
          return { gstin: g, valid: GSTINValidator.validate(g) }
        } catch {
          return { gstin: g, valid: false }
        }
      })

      expect(results.every(r => r.valid)).toBe(true)
    })
  })
})
