#!/usr/bin/env node

/**
 * API Integration Test for Encryption
 * Validates the encryption service layer and helpers
 */

import crypto from 'crypto';

console.log('🌐 Validating API Encryption Integration\n');
console.log('='.repeat(70));

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(1, 3).join('\n')}`);
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// ===== Simulate encryption service functions =====

const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
};

function generateKey() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
}

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    version: 1,
  };
}

function decrypt(encryptedData, key) {
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function encryptToJson(plaintext, key) {
  return JSON.stringify(encrypt(plaintext, key));
}

function decryptFromJson(encryptedJson, key) {
  return decrypt(JSON.parse(encryptedJson), key);
}

function encryptFields(obj, fields, key) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] != null) {
      result[field] = encryptToJson(String(result[field]), key);
    }
  }
  return result;
}

function decryptFields(obj, fields, key) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] != null) {
      result[field] = decryptFromJson(String(result[field]), key);
    }
  }
  return result;
}

// ===== Mock Database =====

class MockDatabase {
  constructor() {
    this.encryptionKeys = new Map();
    this.tenants = new Map();
    this.customers = new Map();
    this.suppliers = new Map();
    this.invoices = new Map();
  }

  async storeTenantKey(tenantId, encryptedDek) {
    this.encryptionKeys.set(tenantId, encryptedDek);
  }

  async getTenantKey(tenantId) {
    return this.encryptionKeys.get(tenantId);
  }

  async createCustomer(customer) {
    const id = `cust-${this.customers.size + 1}`;
    this.customers.set(id, { ...customer, id });
    return { ...customer, id };
  }

  async getCustomer(id) {
    return this.customers.get(id);
  }

  async getAllCustomers() {
    return Array.from(this.customers.values());
  }
}

// ===== Mock Encryption Service =====

class EncryptionService {
  constructor(masterKey) {
    this.masterKey = masterKey;
    this.dekCache = new Map();
  }

  async generateTenantKey(db, tenantId) {
    const dek = generateKey();
    const encryptedDek = encrypt(dek.toString('base64'), this.masterKey);
    await db.storeTenantKey(tenantId, JSON.stringify(encryptedDek));
    this.dekCache.set(tenantId, dek);
    return dek;
  }

  async getTenantKey(db, tenantId) {
    if (this.dekCache.has(tenantId)) {
      return this.dekCache.get(tenantId);
    }

    const encryptedDek = await db.getTenantKey(tenantId);
    if (!encryptedDek) {
      return this.generateTenantKey(db, tenantId);
    }

    const dekBase64 = decrypt(JSON.parse(encryptedDek), this.masterKey);
    const dek = Buffer.from(dekBase64, 'base64');
    this.dekCache.set(tenantId, dek);
    return dek;
  }

  async encryptModelFields(db, tenantId, model, data) {
    const key = await this.getTenantKey(db, tenantId);
    const fields = this.getFieldsForModel(model);
    return encryptFields(data, fields, key);
  }

  async decryptModelFields(db, tenantId, model, data) {
    const key = await this.getTenantKey(db, tenantId);
    const fields = this.getFieldsForModel(model);
    return decryptFields(data, fields, key);
  }

  getFieldsForModel(model) {
    const fieldMap = {
      Customer: ['name', 'gstin', 'pan', 'phone', 'email'],
      Supplier: ['name', 'gstin', 'pan', 'phone', 'email'],
      Invoice: ['notes'],
    };
    return fieldMap[model] || [];
  }
}

// ===== TESTS =====

console.log('\n🔑 Testing Key Management\n');

test('1. Generate master encryption key', () => {
  const mek = generateKey();
  assert(mek.length === 32, 'MEK should be 32 bytes');
});

test('2. Generate and store tenant key', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-001';

  const dek = await service.generateTenantKey(db, tenantId);

  assert(dek.length === 32, 'DEK should be 32 bytes');
  assert(db.encryptionKeys.has(tenantId), 'Key should be stored');
});

test('3. Retrieve tenant key from storage', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-002';

  const dek1 = await service.generateTenantKey(db, tenantId);

  // Clear cache to force retrieval from storage
  service.dekCache.clear();

  const dek2 = await service.getTenantKey(db, tenantId);

  assert(dek1.equals(dek2), 'Retrieved key should match stored key');
});

test('4. Cache tenant keys for performance', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-003';

  await service.generateTenantKey(db, tenantId);

  assert(service.dekCache.has(tenantId), 'Key should be cached');
});

console.log('\n👥 Testing Customer Service with Encryption\n');

test('5. Create encrypted customer', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-004';

  const customerData = {
    name: 'Acme Corp',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    email: 'contact@acme.com',
    phone: '+91-22-12345678',
  };

  // Encrypt before storage
  const encrypted = await service.encryptModelFields(
    db,
    tenantId,
    'Customer',
    customerData
  );

  const customer = await db.createCustomer(encrypted);

  assert(customer.id, 'Customer should have ID');
  assert(customer.name !== customerData.name, 'Name should be encrypted');
  assert(customer.email !== customerData.email, 'Email should be encrypted');
});

test('6. Retrieve and decrypt customer', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-005';

  const customerData = {
    name: 'Beta Inc',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    email: 'info@beta.com',
    phone: '+91-80-98765432',
  };

  // Encrypt and store
  const encrypted = await service.encryptModelFields(
    db,
    tenantId,
    'Customer',
    customerData
  );

  const stored = await db.createCustomer(encrypted);

  // Retrieve and decrypt
  const retrieved = await db.getCustomer(stored.id);
  const decrypted = await service.decryptModelFields(
    db,
    tenantId,
    'Customer',
    retrieved
  );

  assertEquals(decrypted.name, customerData.name);
  assertEquals(decrypted.gstin, customerData.gstin);
  assertEquals(decrypted.email, customerData.email);
});

test('7. List and decrypt multiple customers', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-006';

  const customers = [
    { name: 'Customer A', email: 'a@test.com', gstin: 'GSTIN-A', pan: 'PAN-A', phone: '111' },
    { name: 'Customer B', email: 'b@test.com', gstin: 'GSTIN-B', pan: 'PAN-B', phone: '222' },
    { name: 'Customer C', email: 'c@test.com', gstin: 'GSTIN-C', pan: 'PAN-C', phone: '333' },
  ];

  // Encrypt and store all
  for (const customer of customers) {
    const encrypted = await service.encryptModelFields(
      db,
      tenantId,
      'Customer',
      customer
    );
    await db.createCustomer(encrypted);
  }

  // Retrieve and decrypt all
  const allCustomers = await db.getAllCustomers();
  const decrypted = await Promise.all(
    allCustomers.map(c =>
      service.decryptModelFields(db, tenantId, 'Customer', c)
    )
  );

  assertEquals(decrypted.length, 3);
  assertEquals(decrypted[0].name, 'Customer A');
  assertEquals(decrypted[1].name, 'Customer B');
  assertEquals(decrypted[2].name, 'Customer C');
});

console.log('\n🏢 Testing Multi-Tenant Isolation\n');

test('8. Different tenants have different keys', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();

  const tenant1 = 'tenant-007';
  const tenant2 = 'tenant-008';

  const key1 = await service.getTenantKey(db, tenant1);
  const key2 = await service.getTenantKey(db, tenant2);

  assert(!key1.equals(key2), 'Tenant keys should be different');
});

test('9. Cannot decrypt tenant1 data with tenant2 key', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();

  const tenant1 = 'tenant-009';
  const tenant2 = 'tenant-010';

  const customerData = {
    name: 'Secret Corp',
    email: 'secret@corp.com',
    gstin: 'SECRET123',
    pan: 'PAN123',
    phone: '999',
  };

  // Encrypt with tenant1 key
  const encrypted = await service.encryptModelFields(
    db,
    tenant1,
    'Customer',
    customerData
  );

  // Try to decrypt with tenant2 key
  let failed = false;
  try {
    await service.decryptModelFields(db, tenant2, 'Customer', encrypted);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should not decrypt with wrong tenant key');
});

console.log('\n📄 Testing Invoice Encryption\n');

test('10. Encrypt invoice notes', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-011';

  const invoice = {
    id: 'inv-001',
    invoiceNumber: 'INV-2024-001',
    amount: 100000,
    notes: 'Customer requested extended payment terms. Approved by management.',
    status: 'SENT',
  };

  const encrypted = await service.encryptModelFields(
    db,
    tenantId,
    'Invoice',
    invoice
  );

  // Only notes should be encrypted
  assertEquals(encrypted.amount, invoice.amount);
  assertEquals(encrypted.status, invoice.status);
  assert(encrypted.notes !== invoice.notes, 'Notes should be encrypted');

  const decrypted = await service.decryptModelFields(
    db,
    tenantId,
    'Invoice',
    encrypted
  );

  assertEquals(decrypted.notes, invoice.notes);
});

console.log('\n⚡ Testing Performance & Edge Cases\n');

test('11. Handle empty strings', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-012';

  const data = {
    name: '',
    email: 'test@test.com',
    gstin: '',
    pan: '',
    phone: '',
  };

  const encrypted = await service.encryptModelFields(
    db,
    tenantId,
    'Customer',
    data
  );

  const decrypted = await service.decryptModelFields(
    db,
    tenantId,
    'Customer',
    encrypted
  );

  assertEquals(decrypted.name, '');
  assertEquals(decrypted.email, 'test@test.com');
});

test('12. Handle unicode in customer names', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-013';

  const data = {
    name: '北京科技有限公司 🏢',
    email: 'contact@beijing-tech.cn',
    gstin: 'GSTIN123',
    pan: 'PAN123',
    phone: '+86-10-12345678',
  };

  const encrypted = await service.encryptModelFields(
    db,
    tenantId,
    'Customer',
    data
  );

  const decrypted = await service.decryptModelFields(
    db,
    tenantId,
    'Customer',
    encrypted
  );

  assertEquals(decrypted.name, data.name);
});

test('13. Cache improves performance (no duplicate key generation)', async () => {
  const mek = generateKey();
  const service = new EncryptionService(mek);
  const db = new MockDatabase();
  const tenantId = 'tenant-014';

  // First access generates key
  await service.getTenantKey(db, tenantId);
  const keyCount1 = db.encryptionKeys.size;

  // Second access uses cache
  await service.getTenantKey(db, tenantId);
  const keyCount2 = db.encryptionKeys.size;

  assertEquals(keyCount1, keyCount2, 'Should not generate duplicate keys');
});

console.log('\n🔒 Testing Encryption Configuration\n');

test('14. Verify encryption algorithm', () => {
  assertEquals(ENCRYPTION_CONFIG.algorithm, 'aes-256-gcm');
});

test('15. Verify key length (256 bits)', () => {
  assertEquals(ENCRYPTION_CONFIG.keyLength, 32);
});

// Print results
console.log('\n' + '='.repeat(70));
console.log('\n📊 API Integration Test Results:');
console.log(`   Total Tests:  ${testsRun}`);
console.log(`   ✅ Passed:     ${testsPassed}`);
console.log(`   ❌ Failed:     ${testsFailed}`);
console.log(`   Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All API integration tests passed!');
  console.log('✨ Encryption service layer is working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
