#!/usr/bin/env bun

/**
 * Data Migration Script: Encrypt Existing Unencrypted Data
 *
 * This script encrypts existing data in the database that was created
 * before encryption was enabled.
 *
 * Usage:
 *   MASTER_ENCRYPTION_KEY=your-key bun run scripts/encrypt-existing-data.ts
 *
 * Options:
 *   --dry-run: Show what would be encrypted without making changes
 *   --tenant=<id>: Only encrypt data for specific tenant
 *   --model=<name>: Only encrypt specific model (Customer, Supplier, etc.)
 *
 * Examples:
 *   bun run scripts/encrypt-existing-data.ts --dry-run
 *   bun run scripts/encrypt-existing-data.ts --tenant=abc123
 *   bun run scripts/encrypt-existing-data.ts --model=Customer
 */

import { prisma } from '@accounts/database';
import {
  initializeMasterKey,
  getTenantKey,
  initializeAllTenantKeys,
  encryptFields,
  isEncrypted,
  type EncryptableModel,
  ENCRYPTED_FIELDS,
} from '@accounts/encryption';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const tenantFilter = args.find((a) => a.startsWith('--tenant='))?.split('=')[1];
const modelFilter = args.find((a) => a.startsWith('--model='))?.split('=')[1] as
  | EncryptableModel
  | undefined;

interface MigrationStats {
  model: string;
  total: number;
  encrypted: number;
  skipped: number;
  errors: number;
}

const stats: MigrationStats[] = [];

/**
 * Check if a value needs encryption
 */
function needsEncryption(value: any): boolean {
  if (!value || typeof value !== 'string') return false;
  return !isEncrypted(value);
}

/**
 * Encrypt customers
 */
async function encryptCustomers(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: { tenantId },
  });

  const stat: MigrationStats = {
    model: 'Customer',
    total: customers.length,
    encrypted: 0,
    skipped: 0,
    errors: 0,
  };

  const key = await getTenantKey(prisma, tenantId);
  const fieldsToEncrypt = ENCRYPTED_FIELDS.Customer;

  for (const customer of customers) {
    try {
      // Check which fields need encryption
      const needsUpdate = fieldsToEncrypt.some((field) =>
        needsEncryption(customer[field as keyof typeof customer])
      );

      if (!needsUpdate) {
        stat.skipped++;
        continue;
      }

      // Encrypt fields
      const updates: any = {};
      for (const field of fieldsToEncrypt) {
        const value = customer[field as keyof typeof customer];
        if (needsEncryption(value)) {
          updates[field] = encryptFields({ [field]: value }, [field], key)[field];
        }
      }

      if (!dryRun) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: updates,
        });
      }

      stat.encrypted++;
      console.log(`  ✓ Encrypted customer ${customer.id}`);
    } catch (error) {
      stat.errors++;
      console.error(`  ✗ Failed to encrypt customer ${customer.id}:`, error);
    }
  }

  stats.push(stat);
}

/**
 * Encrypt suppliers
 */
async function encryptSuppliers(tenantId: string) {
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
  });

  const stat: MigrationStats = {
    model: 'Supplier',
    total: suppliers.length,
    encrypted: 0,
    skipped: 0,
    errors: 0,
  };

  const key = await getTenantKey(prisma, tenantId);
  const fieldsToEncrypt = ENCRYPTED_FIELDS.Supplier;

  for (const supplier of suppliers) {
    try {
      const needsUpdate = fieldsToEncrypt.some((field) =>
        needsEncryption(supplier[field as keyof typeof supplier])
      );

      if (!needsUpdate) {
        stat.skipped++;
        continue;
      }

      const updates: any = {};
      for (const field of fieldsToEncrypt) {
        const value = supplier[field as keyof typeof supplier];
        if (needsEncryption(value)) {
          updates[field] = encryptFields({ [field]: value }, [field], key)[field];
        }
      }

      if (!dryRun) {
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: updates,
        });
      }

      stat.encrypted++;
      console.log(`  ✓ Encrypted supplier ${supplier.id}`);
    } catch (error) {
      stat.errors++;
      console.error(`  ✗ Failed to encrypt supplier ${supplier.id}:`, error);
    }
  }

  stats.push(stat);
}

/**
 * Encrypt invoices
 */
async function encryptInvoices(tenantId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
  });

  const stat: MigrationStats = {
    model: 'Invoice',
    total: invoices.length,
    encrypted: 0,
    skipped: 0,
    errors: 0,
  };

  const key = await getTenantKey(prisma, tenantId);
  const fieldsToEncrypt = ENCRYPTED_FIELDS.Invoice;

  for (const invoice of invoices) {
    try {
      const needsUpdate = fieldsToEncrypt.some((field) =>
        needsEncryption(invoice[field as keyof typeof invoice])
      );

      if (!needsUpdate) {
        stat.skipped++;
        continue;
      }

      const updates: any = {};
      for (const field of fieldsToEncrypt) {
        const value = invoice[field as keyof typeof invoice];
        if (needsEncryption(value)) {
          updates[field] = encryptFields({ [field]: value }, [field], key)[field];
        }
      }

      if (!dryRun) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: updates,
        });
      }

      stat.encrypted++;
      console.log(`  ✓ Encrypted invoice ${invoice.id}`);
    } catch (error) {
      stat.errors++;
      console.error(`  ✗ Failed to encrypt invoice ${invoice.id}:`, error);
    }
  }

  stats.push(stat);
}

/**
 * Main migration function
 */
async function main() {
  console.log('🔐 Data Encryption Migration');
  console.log('============================\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Initialize encryption
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) {
    console.error('❌ MASTER_ENCRYPTION_KEY not set');
    process.exit(1);
  }

  initializeMasterKey(masterKey);

  // Initialize tenant keys
  console.log('Initializing tenant encryption keys...');
  await initializeAllTenantKeys(prisma);

  // Get tenants to process
  const tenants = await prisma.tenant.findMany({
    where: tenantFilter ? { id: tenantFilter } : undefined,
    select: { id: true, name: true },
  });

  console.log(`\nFound ${tenants.length} tenant(s) to process\n`);

  // Process each tenant
  for (const tenant of tenants) {
    console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);
    console.log('─'.repeat(50));

    if (!modelFilter || modelFilter === 'Customer') {
      console.log('\n👥 Encrypting customers...');
      await encryptCustomers(tenant.id);
    }

    if (!modelFilter || modelFilter === 'Supplier') {
      console.log('\n🏢 Encrypting suppliers...');
      await encryptSuppliers(tenant.id);
    }

    if (!modelFilter || modelFilter === 'Invoice') {
      console.log('\n📄 Encrypting invoices...');
      await encryptInvoices(tenant.id);
    }

    // Add more models as needed...
  }

  // Print summary
  console.log('\n\n📊 Migration Summary');
  console.log('════════════════════════════════════');
  console.log('Model          Total  Encrypted  Skipped  Errors');
  console.log('─'.repeat(50));

  for (const stat of stats) {
    console.log(
      `${stat.model.padEnd(12)}  ${stat.total.toString().padEnd(5)}  ` +
        `${stat.encrypted.toString().padEnd(9)}  ${stat.skipped.toString().padEnd(7)}  ` +
        `${stat.errors.toString()}`
    );
  }

  console.log('─'.repeat(50));

  const totals = stats.reduce(
    (acc, stat) => ({
      total: acc.total + stat.total,
      encrypted: acc.encrypted + stat.encrypted,
      skipped: acc.skipped + stat.skipped,
      errors: acc.errors + stat.errors,
    }),
    { total: 0, encrypted: 0, skipped: 0, errors: 0 }
  );

  console.log(
    `${'TOTAL'.padEnd(12)}  ${totals.total.toString().padEnd(5)}  ` +
      `${totals.encrypted.toString().padEnd(9)}  ${totals.skipped.toString().padEnd(7)}  ` +
      `${totals.errors.toString()}`
  );

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Migration complete!');
  }

  if (totals.errors > 0) {
    console.log(`\n⚠️  ${totals.errors} errors occurred. Check logs above.`);
    process.exit(1);
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
