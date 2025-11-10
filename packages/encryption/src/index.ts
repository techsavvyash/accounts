/**
 * @accounts/encryption
 *
 * End-to-end encryption utilities for the accounts platform
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Envelope encryption with per-tenant keys
 * - Field-level encryption for sensitive data
 * - Key rotation support
 * - Transparent encryption/decryption
 */

export * from './crypto';
export * from './key-management';
export * from './field-encryption';

// Re-export types
export type { PrismaClient } from '@accounts/database';
