/**
 * Field-level encryption utilities
 * Defines which fields should be encrypted for each model
 */

import type { PrismaClient } from '@accounts/database';
import { getTenantKey } from './key-management';
import { encryptFields, decryptFields } from './crypto';

/**
 * Field encryption configuration for each model
 */
export const ENCRYPTED_FIELDS = {
  // Tenant fields
  Tenant: ['gstin', 'pan', 'phone', 'email'],

  // User fields
  User: ['email', 'fullName'],

  // Customer fields
  Customer: ['name', 'gstin', 'pan', 'phone', 'email'],

  // Supplier fields
  Supplier: ['name', 'gstin', 'pan', 'phone', 'email'],

  // Invoice fields
  Invoice: ['notes'],

  // Journal Entry fields
  JournalEntry: ['description'],

  // Credit Note fields
  CreditNote: ['reason'],

  // Webhook fields
  Webhook: ['url', 'secret'],
} as const;

export type EncryptableModel = keyof typeof ENCRYPTED_FIELDS;

/**
 * Encrypt sensitive fields in an object
 */
export async function encryptModelFields<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  data: T
): Promise<T> {
  const fields = ENCRYPTED_FIELDS[model] as (keyof T)[];
  const key = await getTenantKey(db, tenantId);
  return encryptFields(data, fields, key);
}

/**
 * Decrypt sensitive fields in an object
 */
export async function decryptModelFields<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  data: T
): Promise<T> {
  const fields = ENCRYPTED_FIELDS[model] as (keyof T)[];
  const key = await getTenantKey(db, tenantId);
  return decryptFields(data, fields, key);
}

/**
 * Encrypt fields in an array of objects
 */
export async function encryptModelFieldsArray<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  dataArray: T[]
): Promise<T[]> {
  const key = await getTenantKey(db, tenantId);
  const fields = ENCRYPTED_FIELDS[model] as (keyof T)[];

  return dataArray.map(data => encryptFields(data, fields, key));
}

/**
 * Decrypt fields in an array of objects
 */
export async function decryptModelFieldsArray<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  dataArray: T[]
): Promise<T[]> {
  const key = await getTenantKey(db, tenantId);
  const fields = ENCRYPTED_FIELDS[model] as (keyof T)[];

  return dataArray.map(data => decryptFields(data, fields, key));
}

/**
 * Helper to encrypt data before database insert/update
 */
export async function prepareForStorage<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  data: T
): Promise<T> {
  return encryptModelFields(db, tenantId, model, data);
}

/**
 * Helper to decrypt data after database fetch
 */
export async function prepareForClient<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  data: T | null
): Promise<T | null> {
  if (!data) return null;
  return decryptModelFields(db, tenantId, model, data);
}

/**
 * Helper to decrypt array of data after database fetch
 */
export async function prepareArrayForClient<T extends Record<string, any>>(
  db: PrismaClient,
  tenantId: string,
  model: EncryptableModel,
  dataArray: T[]
): Promise<T[]> {
  return decryptModelFieldsArray(db, tenantId, model, dataArray);
}
