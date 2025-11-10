/**
 * Encryption service for the API
 * Provides high-level encryption operations for API routes
 */

import { prisma } from '@accounts/database';
import {
  initializeMasterKey,
  getTenantKey,
  generateTenantKey,
  rotateTenantKey,
  initializeAllTenantKeys,
  type EncryptableModel,
  encryptModelFields,
  decryptModelFields,
  encryptModelFieldsArray,
  decryptModelFieldsArray,
} from '@accounts/encryption';

/**
 * Initialize the encryption system
 * Call this on application startup
 */
export function initializeEncryption() {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;

  if (!masterKey) {
    console.warn(
      '⚠️  WARNING: MASTER_ENCRYPTION_KEY not set. Encryption is DISABLED. ' +
      'Set MASTER_ENCRYPTION_KEY environment variable to enable encryption.'
    );
    return false;
  }

  if (masterKey.length !== 64) {
    throw new Error(
      'MASTER_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  try {
    initializeMasterKey(masterKey);
    console.log('✅ Encryption system initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize encryption:', error);
    throw error;
  }
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.MASTER_ENCRYPTION_KEY;
}

/**
 * Initialize encryption keys for all tenants
 * Run this once during deployment to set up keys for existing tenants
 */
export async function setupTenantEncryption() {
  if (!isEncryptionEnabled()) {
    console.log('⏭️  Skipping tenant encryption setup (encryption disabled)');
    return;
  }

  console.log('🔐 Setting up encryption keys for all tenants...');
  await initializeAllTenantKeys(prisma);
  console.log('✅ Tenant encryption keys initialized');
}

/**
 * Encrypt data before saving to database
 */
export async function encryptForStorage<T extends Record<string, any>>(
  tenantId: string,
  model: EncryptableModel,
  data: T
): Promise<T> {
  if (!isEncryptionEnabled()) {
    return data; // Pass through if encryption is disabled
  }

  return encryptModelFields(prisma, tenantId, model, data);
}

/**
 * Decrypt data after fetching from database
 */
export async function decryptFromStorage<T extends Record<string, any>>(
  tenantId: string,
  model: EncryptableModel,
  data: T | null
): Promise<T | null> {
  if (!data || !isEncryptionEnabled()) {
    return data; // Pass through if encryption is disabled or no data
  }

  return decryptModelFields(prisma, tenantId, model, data);
}

/**
 * Encrypt array of data before saving to database
 */
export async function encryptArrayForStorage<T extends Record<string, any>>(
  tenantId: string,
  model: EncryptableModel,
  dataArray: T[]
): Promise<T[]> {
  if (!isEncryptionEnabled()) {
    return dataArray;
  }

  return encryptModelFieldsArray(prisma, tenantId, model, dataArray);
}

/**
 * Decrypt array of data after fetching from database
 */
export async function decryptArrayFromStorage<T extends Record<string, any>>(
  tenantId: string,
  model: EncryptableModel,
  dataArray: T[]
): Promise<T[]> {
  if (!isEncryptionEnabled() || dataArray.length === 0) {
    return dataArray;
  }

  return decryptModelFieldsArray(prisma, tenantId, model, dataArray);
}

/**
 * Generate encryption key for a new tenant
 * Call this when creating a new tenant
 */
export async function setupTenantKey(tenantId: string): Promise<void> {
  if (!isEncryptionEnabled()) {
    return;
  }

  await generateTenantKey(prisma, tenantId);
  console.log(`✅ Generated encryption key for tenant ${tenantId}`);
}

/**
 * Rotate encryption key for a tenant
 * This will require re-encrypting all tenant data
 */
export async function rotateEncryptionKey(tenantId: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isEncryptionEnabled()) {
    return {
      success: false,
      message: 'Encryption is not enabled',
    };
  }

  try {
    const { oldKey, newKey } = await rotateTenantKey(prisma, tenantId);

    // TODO: Re-encrypt all tenant data with new key
    // This would require:
    // 1. Fetch all encrypted data
    // 2. Decrypt with old key
    // 3. Encrypt with new key
    // 4. Save back to database

    return {
      success: true,
      message: 'Encryption key rotated successfully. Re-encryption of data is required.',
    };
  } catch (error) {
    console.error('Failed to rotate encryption key:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Encryption helper for specific models
 */
export const encryptionHelpers = {
  customer: {
    encrypt: (tenantId: string, data: any) =>
      encryptForStorage(tenantId, 'Customer', data),
    decrypt: (tenantId: string, data: any) =>
      decryptFromStorage(tenantId, 'Customer', data),
    decryptArray: (tenantId: string, data: any[]) =>
      decryptArrayFromStorage(tenantId, 'Customer', data),
  },

  supplier: {
    encrypt: (tenantId: string, data: any) =>
      encryptForStorage(tenantId, 'Supplier', data),
    decrypt: (tenantId: string, data: any) =>
      decryptFromStorage(tenantId, 'Supplier', data),
    decryptArray: (tenantId: string, data: any[]) =>
      decryptArrayFromStorage(tenantId, 'Supplier', data),
  },

  invoice: {
    encrypt: (tenantId: string, data: any) =>
      encryptForStorage(tenantId, 'Invoice', data),
    decrypt: (tenantId: string, data: any) =>
      decryptFromStorage(tenantId, 'Invoice', data),
    decryptArray: (tenantId: string, data: any[]) =>
      decryptArrayFromStorage(tenantId, 'Invoice', data),
  },

  tenant: {
    encrypt: (tenantId: string, data: any) =>
      encryptForStorage(tenantId, 'Tenant', data),
    decrypt: (tenantId: string, data: any) =>
      decryptFromStorage(tenantId, 'Tenant', data),
  },

  user: {
    encrypt: (tenantId: string, data: any) =>
      encryptForStorage(tenantId, 'User', data),
    decrypt: (tenantId: string, data: any) =>
      decryptFromStorage(tenantId, 'User', data),
  },
};
