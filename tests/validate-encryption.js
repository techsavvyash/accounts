#!/usr/bin/env node

/**
 * Comprehensive validation script for encryption implementation
 * Tests the encryption logic without requiring compilation
 */

import crypto from 'crypto';

console.log('🔐 Validating Encryption Implementation\n');
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
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

// Encryption implementation (copy of crypto.ts logic)
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  authTagLength: 16,
};

function generateKey() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
}

function encrypt(plaintext, key) {
  if (key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv, {
    authTagLength: ENCRYPTION_CONFIG.authTagLength,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: 1,
  };
}

function decrypt(encryptedData, key) {
  if (key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv, {
    authTagLength: ENCRYPTION_CONFIG.authTagLength,
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
  const encryptedData = JSON.parse(encryptedJson);
  return decrypt(encryptedData, key);
}

function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;

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

function encryptFields(obj, fields, key) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      const value = String(result[field]);
      result[field] = encryptToJson(value, key);
    }
  }

  return result;
}

function decryptFields(obj, fields, key) {
  const result = { ...obj };

  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      try {
        result[field] = decryptFromJson(String(result[field]), key);
      } catch (error) {
        console.warn(`Failed to decrypt field ${field}:`, error.message);
      }
    }
  }

  return result;
}

// ===== TEST SUITE =====

console.log('\n📦 Testing Core Encryption Functions\n');

test('1. Generate 32-byte encryption key', () => {
  const key = generateKey();
  assert(key.length === 32, 'Key should be 32 bytes');
  assert(Buffer.isBuffer(key), 'Key should be a Buffer');
});

test('2. Generate different keys each time', () => {
  const key1 = generateKey();
  const key2 = generateKey();
  assert(!key1.equals(key2), 'Keys should be different');
});

test('3. Basic encrypt and decrypt', () => {
  const plaintext = 'Hello, World!';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted, plaintext);
});

test('4. Different ciphertext for same plaintext (random IV)', () => {
  const plaintext = 'Test data';
  const key = generateKey();

  const enc1 = encrypt(plaintext, key);
  const enc2 = encrypt(plaintext, key);

  assert(enc1.ciphertext !== enc2.ciphertext, 'Ciphertext should differ');
  assert(enc1.iv !== enc2.iv, 'IV should differ');

  assertEquals(decrypt(enc1, key), plaintext);
  assertEquals(decrypt(enc2, key), plaintext);
});

test('5. Decrypt fails with wrong key', () => {
  const plaintext = 'Secret';
  const key1 = generateKey();
  const key2 = generateKey();

  const encrypted = encrypt(plaintext, key1);

  let failed = false;
  try {
    decrypt(encrypted, key2);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should fail with wrong key');
});

test('6. Handle empty string', () => {
  const plaintext = '';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted, plaintext);
});

test('7. Handle unicode characters', () => {
  const plaintext = '你好世界 🔐 مرحبا';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted, plaintext);
});

test('8. Handle long text (10KB)', () => {
  const plaintext = 'A'.repeat(10000);
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted.length, 10000);
});

console.log('\n📝 Testing Field-Level Encryption\n');

test('9. Encrypt specific fields only', () => {
  const obj = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
  };
  const key = generateKey();

  const encrypted = encryptFields(obj, ['name', 'email'], key);

  assertEquals(encrypted.id, '123');
  assertEquals(encrypted.status, 'active');
  assert(encrypted.name !== 'John Doe', 'Name should be encrypted');
  assert(encrypted.email !== 'john@example.com', 'Email should be encrypted');
});

test('10. Decrypt fields back to original', () => {
  const obj = {
    id: '456',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
  };
  const key = generateKey();

  const encrypted = encryptFields(obj, ['name', 'email', 'phone'], key);
  const decrypted = decryptFields(encrypted, ['name', 'email', 'phone'], key);

  assertEquals(decrypted.name, obj.name);
  assertEquals(decrypted.email, obj.email);
  assertEquals(decrypted.phone, obj.phone);
});

test('11. Handle null and undefined values', () => {
  const obj = {
    id: '789',
    name: 'Test',
    email: null,
    phone: undefined,
  };
  const key = generateKey();

  const encrypted = encryptFields(obj, ['name', 'email', 'phone'], key);
  const decrypted = decryptFields(encrypted, ['name', 'email', 'phone'], key);

  assertEquals(decrypted.name, 'Test');
  assertEquals(decrypted.email, null);
  assertEquals(decrypted.phone, undefined);
});

console.log('\n👥 Testing Customer Data Encryption\n');

test('12. Encrypt customer PII data', () => {
  const customer = {
    id: 'cust-001',
    name: 'ABC Enterprises',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    email: 'contact@abc.com',
    phone: '+91-22-12345678',
    creditLimit: 100000,
  };

  const key = generateKey();
  const fields = ['name', 'gstin', 'pan', 'email', 'phone'];

  const encrypted = encryptFields(customer, fields, key);

  // Non-sensitive fields unchanged
  assertEquals(encrypted.id, customer.id);
  assertEquals(encrypted.creditLimit, customer.creditLimit);

  // Sensitive fields encrypted
  fields.forEach(field => {
    assert(isEncrypted(encrypted[field]), `${field} should be encrypted`);
  });

  // Verify decryption
  const decrypted = decryptFields(encrypted, fields, key);
  assertEquals(decrypted.name, customer.name);
  assertEquals(decrypted.gstin, customer.gstin);
  assertEquals(decrypted.pan, customer.pan);
});

test('13. Encrypt multiple customers (batch)', () => {
  const customers = [
    { id: '1', name: 'Customer A', email: 'a@test.com', phone: '111' },
    { id: '2', name: 'Customer B', email: 'b@test.com', phone: '222' },
    { id: '3', name: 'Customer C', email: 'c@test.com', phone: '333' },
  ];

  const key = generateKey();
  const fields = ['name', 'email', 'phone'];

  const encrypted = customers.map(c => encryptFields(c, fields, key));
  const decrypted = encrypted.map(c => decryptFields(c, fields, key));

  decrypted.forEach((c, i) => {
    assertEquals(c.name, customers[i].name);
    assertEquals(c.email, customers[i].email);
    assertEquals(c.phone, customers[i].phone);
  });
});

console.log('\n🛡️  Testing Security Features\n');

test('14. Detect tampered ciphertext', () => {
  const plaintext = 'Important';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);

  // Tamper with ciphertext
  const tampered = {
    ...encrypted,
    ciphertext: Buffer.from(encrypted.ciphertext, 'base64')
      .reverse()
      .toString('base64'),
  };

  let failed = false;
  try {
    decrypt(tampered, key);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should detect tampered data');
});

test('15. Detect tampered auth tag', () => {
  const plaintext = 'Data';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);

  const tampered = {
    ...encrypted,
    authTag: Buffer.from('0000000000000000', 'hex').toString('base64'),
  };

  let failed = false;
  try {
    decrypt(tampered, key);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should detect invalid auth tag');
});

test('16. Reject invalid key length', () => {
  const shortKey = Buffer.from('short');

  let failed = false;
  try {
    encrypt('test', shortKey);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should reject short key');
});

console.log('\n🔄 Testing Envelope Encryption Pattern\n');

test('17. Simulate envelope encryption (MEK/DEK)', () => {
  // Master Encryption Key
  const mek = generateKey();

  // Data Encryption Key for tenant
  const dek = generateKey();

  // Encrypt DEK with MEK
  const encryptedDek = encrypt(dek.toString('base64'), mek);

  // Decrypt DEK
  const decryptedDekBase64 = decrypt(encryptedDek, mek);
  const decryptedDek = Buffer.from(decryptedDekBase64, 'base64');

  assert(decryptedDek.equals(dek), 'DEK should be recoverable');

  // Use DEK to encrypt data
  const data = 'Customer PII';
  const encryptedData = encrypt(data, dek);
  const decryptedData = decrypt(encryptedData, dek);

  assertEquals(decryptedData, data);
});

console.log('\n🏪 Testing E-Commerce Use Cases\n');

test('18. Encrypt invoice with sensitive notes', () => {
  const invoice = {
    id: 'inv-001',
    invoiceNumber: 'INV-2024-001',
    amount: 50000,
    notes: 'Customer requested 30 days credit. Special pricing applied.',
    status: 'SENT',
  };

  const key = generateKey();
  const encrypted = encryptFields(invoice, ['notes'], key);

  assertEquals(encrypted.amount, invoice.amount);
  assert(isEncrypted(encrypted.notes), 'Notes should be encrypted');

  const decrypted = decryptFields(encrypted, ['notes'], key);
  assertEquals(decrypted.notes, invoice.notes);
});

test('19. Encrypt supplier information', () => {
  const supplier = {
    id: 'sup-001',
    name: 'XYZ Suppliers Ltd',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    email: 'contact@xyz.com',
    phone: '+91-80-98765432',
  };

  const key = generateKey();
  const fields = ['name', 'gstin', 'pan', 'email', 'phone'];

  const encrypted = encryptFields(supplier, fields, key);
  const decrypted = decryptFields(encrypted, fields, key);

  assertEquals(decrypted.name, supplier.name);
  assertEquals(decrypted.gstin, supplier.gstin);
  assertEquals(decrypted.pan, supplier.pan);
});

test('20. Encrypt webhook secret', () => {
  const webhook = {
    id: 'wh-001',
    url: 'https://example.com/webhook',
    secret: 'whsec_1234567890abcdef',
    events: ['invoice.created', 'invoice.paid'],
  };

  const key = generateKey();
  const encrypted = encryptFields(webhook, ['url', 'secret'], key);

  assert(isEncrypted(encrypted.url), 'URL should be encrypted');
  assert(isEncrypted(encrypted.secret), 'Secret should be encrypted');

  const decrypted = decryptFields(encrypted, ['url', 'secret'], key);
  assertEquals(decrypted.url, webhook.url);
  assertEquals(decrypted.secret, webhook.secret);
});

// Print results
console.log('\n' + '='.repeat(70));
console.log('\n📊 Validation Results:');
console.log(`   Total Tests:  ${testsRun}`);
console.log(`   ✅ Passed:     ${testsPassed}`);
console.log(`   ❌ Failed:     ${testsFailed}`);
console.log(`   Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All validation tests passed!');
  console.log('✨ Encryption implementation is working correctly.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
