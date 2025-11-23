import { describe, test, expect } from 'bun:test'
import { HSNRegistry } from '../src/hsn-registry'

describe('HSNRegistry', () => {
  describe('getAllChapters', () => {
    test('should return all registered HSN chapters', () => {
      const chapters = HSNRegistry.getAllChapters()
      // We have 97 chapters (chapters 67 and 77 don't exist in standard HSN)
      expect(chapters.length).toBeGreaterThanOrEqual(97)
      expect(chapters.length).toBeLessThanOrEqual(99)
    })

    test('each chapter should have required properties', () => {
      const chapters = HSNRegistry.getAllChapters()
      chapters.forEach(chapter => {
        expect(chapter.code).toBeTruthy()
        expect(chapter.description).toBeTruthy()
        expect(chapter.section).toBeTruthy()
      })
    })
  })

  describe('getChapter', () => {
    test('should get specific chapter', () => {
      const chapter = HSNRegistry.getChapter('84')
      expect(chapter).toBeDefined()
      expect(chapter?.code).toBe('84')
      expect(chapter?.description).toContain('Nuclear Reactors')
    })

    test('should return undefined for invalid chapter', () => {
      const chapter = HSNRegistry.getChapter('999')
      expect(chapter).toBeUndefined()
    })

    test('should handle zero-padded codes', () => {
      const chapter = HSNRegistry.getChapter('01')
      expect(chapter).toBeDefined()
      expect(chapter?.code).toBe('01')
    })
  })

  describe('getChaptersBySection', () => {
    test('should get chapters by section', () => {
      const section16 = HSNRegistry.getChaptersBySection('XVI')
      expect(section16.length).toBeGreaterThan(0)
      expect(section16.every(ch => ch.section === 'XVI')).toBe(true)
    })

    test('should return empty array for invalid section', () => {
      const invalid = HSNRegistry.getChaptersBySection('INVALID')
      expect(invalid).toEqual([])
    })
  })

  describe('findByCode', () => {
    test('should find exact HSN code', () => {
      const hsn = HSNRegistry.findByCode('847130')
      expect(hsn).toBeDefined()
      expect(hsn?.code).toBe('847130')
      expect(hsn?.description).toContain('Laptop')
      expect(hsn?.gstRate).toBe(18)
    })

    test('should return undefined for unregistered code', () => {
      const hsn = HSNRegistry.findByCode('999999')
      expect(hsn).toBeUndefined()
    })
  })

  describe('searchByDescription', () => {
    test('should search by description', () => {
      const results = HSNRegistry.searchByDescription('laptop')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].description.toLowerCase()).toContain('laptop')
    })

    test('should be case insensitive', () => {
      const results1 = HSNRegistry.searchByDescription('LAPTOP')
      const results2 = HSNRegistry.searchByDescription('laptop')
      expect(results1.length).toBe(results2.length)
    })

    test('should return empty array for no matches', () => {
      const results = HSNRegistry.searchByDescription('nonexistentproduct123')
      expect(results).toEqual([])
    })

    test('should find partial matches', () => {
      const results = HSNRegistry.searchByDescription('phone')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('getByChapter', () => {
    test('should get all codes for chapter', () => {
      const codes = HSNRegistry.getByChapter('84')
      expect(codes.length).toBeGreaterThan(0)
      codes.forEach(code => {
        expect(code.chapter).toBe('84')
      })
    })

    test('should return empty array for chapter with no registered codes', () => {
      const codes = HSNRegistry.getByChapter('67') // Chapter with no registered codes
      expect(codes).toEqual([])
    })
  })

  describe('getByGSTRate', () => {
    test('should get all codes with specific GST rate', () => {
      const codes18 = HSNRegistry.getByGSTRate(18)
      expect(codes18.length).toBeGreaterThan(0)
      codes18.forEach(code => {
        expect(code.gstRate).toBe(18)
      })
    })

    test('should handle different rates', () => {
      const rates = [0, 5, 12, 18, 28]
      rates.forEach(rate => {
        const codes = HSNRegistry.getByGSTRate(rate)
        if (codes.length > 0) {
          expect(codes.every(c => c.gstRate === rate)).toBe(true)
        }
      })
    })
  })

  describe('getRecommendedGSTRate', () => {
    test('should return rate for exact match', () => {
      const rate = HSNRegistry.getRecommendedGSTRate('847130')
      expect(rate).toBe(18)
    })

    test('should return rate for prefix match', () => {
      const rate = HSNRegistry.getRecommendedGSTRate('84713000')
      expect(rate).toBe(18) // Should match 847130
    })

    test('should return undefined for unregistered code', () => {
      const rate = HSNRegistry.getRecommendedGSTRate('999999')
      expect(rate).toBeUndefined()
    })

    test('should handle 2-digit codes', () => {
      const rate = HSNRegistry.getRecommendedGSTRate('84')
      expect(rate).toBeUndefined() // 2-digit chapter codes don't have direct rates
    })
  })

  describe('getDetails', () => {
    test('should return comprehensive details', () => {
      const details = HSNRegistry.getDetails('847130')

      expect(details.code).toBe('847130')
      expect(details.chapter).toBeDefined()
      expect(details.chapter?.code).toBe('84')
      expect(details.details).toBeDefined()
      expect(details.details?.gstRate).toBe(18)
      expect(details.recommendedGSTRate).toBe(18)
    })

    test('should return chapter info for unknown codes', () => {
      const details = HSNRegistry.getDetails('8499')

      expect(details.code).toBe('8499')
      expect(details.chapter).toBeDefined()
      expect(details.chapter?.code).toBe('84')
      expect(details.details).toBeUndefined()
    })
  })

  describe('lookup', () => {
    test('should lookup registered HSN code', () => {
      const result = HSNRegistry.lookup('847130')

      expect(result.isValid).toBe(true)
      expect(result.code).toBe('847130')
      expect(result.description).toContain('Laptop')
      expect(result.gstRate).toBe(18)
      expect(result.unit).toBe('NOS')
      expect(result.chapterDescription).toBeTruthy()
    })

    test('should lookup unregistered code with chapter info', () => {
      const result = HSNRegistry.lookup('8499')

      expect(result.isValid).toBe(true)
      expect(result.code).toBe('8499')
      expect(result.chapterDescription).toBeTruthy()
    })

    test('should handle invalid codes', () => {
      const result = HSNRegistry.lookup('X')

      expect(result.isValid).toBe(false)
      expect(result.description).toContain('Invalid')
    })

    test('should include cess information when available', () => {
      const result = HSNRegistry.lookup('870323') // Cars with cess

      expect(result.isValid).toBe(true)
      expect(result.gstRate).toBe(28)
      expect(result.cess).toBe(17)
    })
  })

  describe('getAllCodes', () => {
    test('should return all registered codes', () => {
      const codes = HSNRegistry.getAllCodes()
      // We have 82+ commonly used HSN codes registered
      expect(codes.length).toBeGreaterThanOrEqual(80)
    })

    test('each code should have required properties', () => {
      const codes = HSNRegistry.getAllCodes()
      codes.forEach(code => {
        expect(code.code).toBeTruthy()
        expect(code.description).toBeTruthy()
        expect(code.chapter).toBeTruthy()
      })
    })
  })

  describe('getCount', () => {
    test('should return count statistics', () => {
      const stats = HSNRegistry.getCount()

      // We have 97 chapters (67 and 77 don't exist)
      expect(stats.chapters).toBeGreaterThanOrEqual(97)
      // We have 82+ commonly used HSN codes registered
      expect(stats.codes).toBeGreaterThanOrEqual(80)
    })
  })

  describe('specific product categories', () => {
    test('should have electronics codes', () => {
      const laptop = HSNRegistry.findByCode('847130')
      const mobile = HSNRegistry.findByCode('851712')

      expect(laptop?.gstRate).toBe(18)
      expect(mobile?.gstRate).toBe(18)
    })

    test('should have food items', () => {
      const rice = HSNRegistry.findByCode('1006')
      const milk = HSNRegistry.findByCode('0401')

      expect(rice?.gstRate).toBe(0)
      expect(milk?.gstRate).toBe(0)
    })

    test('should have automobiles with cess', () => {
      const car = HSNRegistry.findByCode('870323')

      expect(car?.gstRate).toBe(28)
      expect(car?.cess).toBe(17)
    })

    test('should have pharmaceuticals', () => {
      const medicines = HSNRegistry.findByCode('3004')

      expect(medicines?.gstRate).toBe(12)
    })

    test('should have textiles', () => {
      const cotton = HSNRegistry.findByCode('5208')

      expect(cotton?.gstRate).toBe(5)
    })
  })

  describe('integration scenarios', () => {
    test('should support product search workflow', () => {
      // Search for product
      const results = HSNRegistry.searchByDescription('laptop')
      expect(results.length).toBeGreaterThan(0)

      // Get details of first result
      const details = HSNRegistry.getDetails(results[0].code)
      expect(details.recommendedGSTRate).toBeDefined()

      // Lookup complete info
      const info = HSNRegistry.lookup(results[0].code)
      expect(info.isValid).toBe(true)
    })

    test('should support chapter browsing workflow', () => {
      // Get all chapters
      const chapters = HSNRegistry.getAllChapters()
      expect(chapters.length).toBeGreaterThanOrEqual(97)

      // Get codes for a chapter
      const chapter84 = chapters.find(ch => ch.code === '84')
      expect(chapter84).toBeDefined()

      const codes = HSNRegistry.getByChapter('84')
      expect(codes.length).toBeGreaterThan(0)
    })

    test('should support rate-based filtering', () => {
      // Find all 18% GST items
      const items18 = HSNRegistry.getByGSTRate(18)
      expect(items18.length).toBeGreaterThan(0)

      // Each item should have 18% rate
      items18.forEach(item => {
        expect(item.gstRate).toBe(18)
      })
    })
  })
})
