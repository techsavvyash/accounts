/**
 * Encryption middleware for automatic encryption/decryption
 *
 * This middleware provides transparent encryption for API responses
 * and decryption for API requests when needed.
 */

import { isEncryptionEnabled } from '../services/encryption';

/**
 * Middleware to add encryption helpers to the request context
 * This allows routes to easily encrypt/decrypt data
 */
export const encryptionContext = async ({ store }: any) => {
  // Add encryption flag to store
  store.encryptionEnabled = isEncryptionEnabled();

  // Add helper function to check if encryption is active
  store.shouldEncrypt = () => {
    return store.encryptionEnabled && store.tenantId;
  };
};

/**
 * Response encryption middleware
 * Automatically encrypts sensitive fields in responses
 *
 * Note: This is currently opt-in via the encryption service helpers.
 * Routes should manually call encryption helpers for their data.
 *
 * Future enhancement: Could add automatic encryption based on response schema
 */
export const encryptResponse = async ({ response, store }: any) => {
  if (!store.shouldEncrypt?.()) {
    return response;
  }

  // For now, routes handle encryption manually
  // This middleware is a placeholder for future automatic encryption
  return response;
};

/**
 * Request decryption middleware
 * Automatically decrypts encrypted fields in request bodies
 *
 * Note: This is currently opt-in via the encryption service helpers.
 * Routes should manually call decryption helpers for their data.
 *
 * Future enhancement: Could add automatic decryption based on request schema
 */
export const decryptRequest = async ({ body, store }: any) => {
  if (!store.shouldEncrypt?.()) {
    return;
  }

  // For now, routes handle decryption manually
  // This middleware is a placeholder for future automatic decryption
};

/**
 * Encryption info endpoint middleware
 * Adds encryption status to health/info endpoints
 */
export const addEncryptionInfo = () => {
  return {
    encryptionEnabled: isEncryptionEnabled(),
    algorithm: 'AES-256-GCM',
    keyManagement: 'Envelope encryption with per-tenant keys',
  };
};
