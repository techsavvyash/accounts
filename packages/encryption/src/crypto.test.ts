/**
 * Unit tests for cryptographic utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  generateKey,
  encrypt,
  decrypt,
  encryptToJson,
  decryptFromJson,
  encryptFields,
  decryptFields,
  isEncrypted,
} from './crypto';

describe('Crypto Utilities', () => {
  describe('generateKey', () => {
    test('should generate 32-byte key', () => {
      const key = generateKey();
      expect(key.length).toBe(32);
    });

    test('should generate different keys each time', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    test('should encrypt and decrypt text correctly', () => {
      const plaintext = 'Hello, World!';
      const key = generateKey();

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    test('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Test data';
      const key = generateKey();

      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);

      // Same plaintext should produce different ciphertext due to random IV
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);

      // But both should decrypt to same plaintext
      expect(decrypt(encrypted1, key)).toBe(plaintext);
      expect(decrypt(encrypted2, key)).toBe(plaintext);
    });

    test('should fail with wrong key', () => {
      const plaintext = 'Secret message';
      const key1 = generateKey();
      const key2 = generateKey();

      const encrypted = encrypt(plaintext, key1);

      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    test('should handle empty string', () => {
      const plaintext = '';
      const key = generateKey();

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle unicode characters', () => {
      const plaintext = '你好世界 🔐 مرحبا';
      const key = generateKey();

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    test('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const key = generateKey();

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptToJson and decryptFromJson', () => {
    test('should encrypt and decrypt via JSON', () => {
      const plaintext = 'JSON test data';
      const key = generateKey();

      const encryptedJson = encryptToJson(plaintext, key);
      const decrypted = decryptFromJson(encryptedJson, key);

      expect(decrypted).toBe(plaintext);
    });

    test('should produce valid JSON', () => {
      const plaintext = 'Test';
      const key = generateKey();

      const encryptedJson = encryptToJson(plaintext, key);
      const parsed = JSON.parse(encryptedJson);

      expect(parsed).toHaveProperty('ciphertext');
      expect(parsed).toHaveProperty('iv');
      expect(parsed).toHaveProperty('authTag');
      expect(parsed).toHaveProperty('version');
      expect(parsed.version).toBe(1);
    });
  });

  describe('encryptFields and decryptFields', () => {
    test('should encrypt specified fields only', () => {
      const obj = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active',
      };
      const key = generateKey();

      const encrypted = encryptFields(obj, ['name', 'email'], key);

      expect(encrypted.id).toBe('123'); // Not encrypted
      expect(encrypted.status).toBe('active'); // Not encrypted
      expect(encrypted.name).not.toBe('John Doe'); // Encrypted
      expect(encrypted.email).not.toBe('john@example.com'); // Encrypted
    });

    test('should decrypt fields back to original values', () => {
      const obj = {
        id: '123',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
      };
      const key = generateKey();

      const encrypted = encryptFields(obj, ['name', 'email', 'phone'], key);
      const decrypted = decryptFields(encrypted, ['name', 'email', 'phone'], key);

      expect(decrypted).toEqual(obj);
    });

    test('should handle null and undefined values', () => {
      const obj = {
        id: '123',
        name: 'Test',
        email: null,
        phone: undefined,
      };
      const key = generateKey();

      const encrypted = encryptFields(obj, ['name', 'email', 'phone'], key);
      const decrypted = decryptFields(encrypted, ['name', 'email', 'phone'], key);

      expect(decrypted.id).toBe('123');
      expect(decrypted.name).toBe('Test');
      expect(decrypted.email).toBe(null);
      expect(decrypted.phone).toBe(undefined);
    });

    test('should handle number fields', () => {
      const obj = {
        id: '123',
        amount: 42.99,
        count: 5,
      };
      const key = generateKey();

      const encrypted = encryptFields(obj, ['amount', 'count'], key);
      const decrypted = decryptFields(encrypted, ['amount', 'count'], key);

      expect(decrypted.amount).toBe('42.99'); // Converted to string
      expect(decrypted.count).toBe('5'); // Converted to string
    });
  });

  describe('isEncrypted', () => {
    test('should detect encrypted JSON string', () => {
      const plaintext = 'Test';
      const key = generateKey();
      const encrypted = encryptToJson(plaintext, key);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    test('should return false for plaintext', () => {
      expect(isEncrypted('Hello World')).toBe(false);
      expect(isEncrypted('{"foo": "bar"}')).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });

    test('should return false for null and undefined', () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });

    test('should return false for invalid JSON', () => {
      expect(isEncrypted('not json')).toBe(false);
      expect(isEncrypted('{"incomplete": ')).toBe(false);
    });
  });

  describe('Error handling', () => {
    test('should throw on invalid key length', () => {
      const shortKey = Buffer.from('short');
      expect(() => encrypt('test', shortKey)).toThrow();
      expect(() => decrypt({ ciphertext: '', iv: '', authTag: '', version: 1 }, shortKey)).toThrow();
    });

    test('should throw on tampered ciphertext', () => {
      const plaintext = 'Test';
      const key = generateKey();
      const encrypted = encrypt(plaintext, key);

      // Tamper with ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: Buffer.from(encrypted.ciphertext, 'base64')
          .reverse()
          .toString('base64'),
      };

      expect(() => decrypt(tampered, key)).toThrow();
    });

    test('should throw on tampered auth tag', () => {
      const plaintext = 'Test';
      const key = generateKey();
      const encrypted = encrypt(plaintext, key);

      // Tamper with auth tag
      const tampered = {
        ...encrypted,
        authTag: Buffer.from('0000000000000000', 'hex').toString('base64'),
      };

      expect(() => decrypt(tampered, key)).toThrow();
    });
  });
});
