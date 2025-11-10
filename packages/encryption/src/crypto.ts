/**
 * Core cryptographic utilities for end-to-end encryption
 * Uses AES-256-GCM for authenticated encryption
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

/**
 * Encryption configuration
 */
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  authTagLength: 16, // 128 bits
  saltLength: 32,
  iterations: 100000,
} as const;

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
  version: number; // for future algorithm changes
}

/**
 * Generate a cryptographically secure random key
 */
export function generateKey(): Buffer {
  return randomBytes(ENCRYPTION_CONFIG.keyLength);
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param key - Encryption key (32 bytes)
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  if (key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  // Generate random IV
  const iv = randomBytes(ENCRYPTION_CONFIG.ivLength);

  // Create cipher
  const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv, {
    authTagLength: ENCRYPTION_CONFIG.authTagLength,
  });

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data with IV and auth tag
 * @param key - Decryption key (32 bytes)
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData, key: Buffer): string {
  if (key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  // Parse encrypted data
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  // Create decipher
  const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv, {
    authTagLength: ENCRYPTION_CONFIG.authTagLength,
  });

  // Set auth tag
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt data and return as JSON string
 */
export function encryptToJson(plaintext: string, key: Buffer): string {
  return JSON.stringify(encrypt(plaintext, key));
}

/**
 * Decrypt data from JSON string
 */
export function decryptFromJson(encryptedJson: string, key: Buffer): string {
  const encryptedData = JSON.parse(encryptedJson) as EncryptedData;
  return decrypt(encryptedData, key);
}

/**
 * Encrypt an object's fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  key: Buffer
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      const value = String(result[field]);
      result[field] = encryptToJson(value, key) as any;
    }
  }

  return result;
}

/**
 * Decrypt an object's fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  key: Buffer
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      try {
        result[field] = decryptFromJson(String(result[field]), key) as any;
      } catch (error) {
        // If decryption fails, it might be unencrypted data
        // Keep original value for backward compatibility
        console.warn(`Failed to decrypt field ${String(field)}:`, error);
      }
    }
  }

  return result;
}

/**
 * Check if a string is encrypted (basic heuristic)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const parsed = JSON.parse(value);
    return (
      parsed &&
      typeof parsed === 'object' &&
      'ciphertext' in parsed &&
      'iv' in parsed &&
      'authTag' in parsed &&
      'version' in parsed
    );
  } catch {
    return false;
  }
}
