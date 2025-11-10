/**
 * Key Management System
 * Implements envelope encryption with per-tenant Data Encryption Keys (DEK)
 */

import { generateKey, encrypt, decrypt, type EncryptedData } from './crypto';
import type { PrismaClient } from '@accounts/database';

/**
 * Master Encryption Key (MEK) - should be stored securely in environment
 */
let masterKey: Buffer | null = null;

/**
 * Initialize the encryption system with master key
 */
export function initializeMasterKey(key: string | Buffer) {
  if (typeof key === 'string') {
    // If string, it should be hex or base64 encoded
    masterKey = Buffer.from(key, 'hex');
  } else {
    masterKey = key;
  }

  if (masterKey.length !== 32) {
    throw new Error('Master key must be 32 bytes (256 bits)');
  }
}

/**
 * Get the master key (throws if not initialized)
 */
function getMasterKey(): Buffer {
  if (!masterKey) {
    throw new Error('Master encryption key not initialized. Call initializeMasterKey() first.');
  }
  return masterKey;
}

/**
 * In-memory cache for DEKs to avoid database lookups
 */
const dekCache = new Map<string, Buffer>();

/**
 * Generate and store a new DEK for a tenant
 */
export async function generateTenantKey(
  db: PrismaClient,
  tenantId: string
): Promise<Buffer> {
  // Generate new DEK
  const dek = generateKey();

  // Encrypt DEK with MEK (envelope encryption)
  const encryptedDek = encrypt(dek.toString('base64'), getMasterKey());

  // Store encrypted DEK in database
  await db.encryptionKey.create({
    data: {
      tenantId,
      encryptedKey: JSON.stringify(encryptedDek),
      algorithm: 'aes-256-gcm',
      version: 1,
      isActive: true,
    },
  });

  // Cache the DEK
  dekCache.set(tenantId, dek);

  return dek;
}

/**
 * Get tenant's DEK (from cache or database)
 */
export async function getTenantKey(
  db: PrismaClient,
  tenantId: string
): Promise<Buffer> {
  // Check cache first
  if (dekCache.has(tenantId)) {
    return dekCache.get(tenantId)!;
  }

  // Fetch from database
  const keyRecord = await db.encryptionKey.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!keyRecord) {
    // Generate new key if none exists
    return generateTenantKey(db, tenantId);
  }

  // Decrypt DEK using MEK
  const encryptedDek = JSON.parse(keyRecord.encryptedKey) as EncryptedData;
  const dekBase64 = decrypt(encryptedDek, getMasterKey());
  const dek = Buffer.from(dekBase64, 'base64');

  // Cache the DEK
  dekCache.set(tenantId, dek);

  return dek;
}

/**
 * Rotate tenant's encryption key
 * This will generate a new key and mark the old one as inactive
 */
export async function rotateTenantKey(
  db: PrismaClient,
  tenantId: string
): Promise<{ oldKey: Buffer; newKey: Buffer }> {
  // Get current key
  const oldKey = await getTenantKey(db, tenantId);

  // Mark current key as inactive
  await db.encryptionKey.updateMany({
    where: {
      tenantId,
      isActive: true,
    },
    data: {
      isActive: false,
      rotatedAt: new Date(),
    },
  });

  // Generate new key
  const newKey = await generateTenantKey(db, tenantId);

  // Clear cache to force fresh fetch
  dekCache.delete(tenantId);

  return { oldKey, newKey };
}

/**
 * Clear DEK cache (useful for testing or security)
 */
export function clearKeyCache(tenantId?: string) {
  if (tenantId) {
    dekCache.delete(tenantId);
  } else {
    dekCache.clear();
  }
}

/**
 * Get all active tenant keys (for re-encryption during key rotation)
 */
export async function getAllActiveTenantKeys(
  db: PrismaClient
): Promise<Map<string, Buffer>> {
  const keys = await db.encryptionKey.findMany({
    where: {
      isActive: true,
    },
  });

  const keyMap = new Map<string, Buffer>();

  for (const keyRecord of keys) {
    const encryptedDek = JSON.parse(keyRecord.encryptedKey) as EncryptedData;
    const dekBase64 = decrypt(encryptedDek, getMasterKey());
    const dek = Buffer.from(dekBase64, 'base64');
    keyMap.set(keyRecord.tenantId, dek);
  }

  return keyMap;
}

/**
 * Initialize encryption keys for all existing tenants
 * (useful for migrating existing data)
 */
export async function initializeAllTenantKeys(
  db: PrismaClient
): Promise<void> {
  const tenants = await db.tenant.findMany({
    select: { id: true },
  });

  for (const tenant of tenants) {
    const existingKey = await db.encryptionKey.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
    });

    if (!existingKey) {
      await generateTenantKey(db, tenant.id);
      console.log(`Generated encryption key for tenant ${tenant.id}`);
    }
  }
}
