#!/usr/bin/env bun

/**
 * Integration test for encryption system
 *
 * This validates the complete encryption flow without requiring database
 */

import { randomBytes } from 'crypto';
import {
  generateKey,
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptToJson,
  decryptFromJson,
  isEncrypted,
  ENCRYPTION_CONFIG,
} from './crypto';

console.log('🧪 Running Encryption Integration Tests\n');
console.log('=' .repeat(60));

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  testsRun++;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        () => {
          testsPassed++;
          console.log(`✅ ${name}`);
        },
        (error) => {
          testsFailed++;
          console.error(`❌ ${name}`);
          console.error(`   Error: ${error.message}`);
        }
      );
    } else {
      testsPassed++;
      console.log(`✅ ${name}`);
    }
  } catch (error: any) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

// Test 1: Key Generation
test('Generate encryption key', () => {
  const key = generateKey();
  assert(key.length === 32, 'Key should be 32 bytes');
  assert(Buffer.isBuffer(key), 'Key should be a Buffer');
});

// Test 2: Basic Encryption/Decryption
test('Encrypt and decrypt simple text', () => {
  const plaintext = 'Hello, Encryption!';
  const key = generateKey();

  const encrypted = encrypt(plaintext, key);
  assert(encrypted.ciphertext.length > 0, 'Ciphertext should not be empty');
  assert(encrypted.iv.length > 0, 'IV should not be empty');
  assert(encrypted.authTag.length > 0, 'Auth tag should not be empty');
  assert(encrypted.version === 1, 'Version should be 1');

  const decrypted = decrypt(encrypted, key);
  assertEquals(decrypted, plaintext, 'Decrypted text should match original');
});

// Test 3: Sensitive Data (PII)
test('Encrypt sensitive PII data', () => {
  const pii = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91-9876543210',
    pan: 'ABCDE1234F',
    gstin: '29ABCDE1234F1Z5',
  };

  const key = generateKey();
  const encrypted = encryptFields(pii, ['name', 'email', 'phone', 'pan', 'gstin'], key);

  // Verify encryption
  assert(isEncrypted(encrypted.name), 'Name should be encrypted');
  assert(isEncrypted(encrypted.email), 'Email should be encrypted');
  assert(isEncrypted(encrypted.phone), 'Phone should be encrypted');
  assert(isEncrypted(encrypted.pan), 'PAN should be encrypted');
  assert(isEncrypted(encrypted.gstin), 'GSTIN should be encrypted');

  // Verify decryption
  const decrypted = decryptFields(
    encrypted,
    ['name', 'email', 'phone', 'pan', 'gstin'],
    key
  );

  assertEquals(decrypted.name, pii.name);
  assertEquals(decrypted.email, pii.email);
  assertEquals(decrypted.phone, pii.phone);
  assertEquals(decrypted.pan, pii.pan);
  assertEquals(decrypted.gstin, pii.gstin);
});

// Test 4: Customer Data Simulation
test('Encrypt complete customer record', () => {
  const customer = {
    id: 'cust-123',
    name: 'ABC Enterprises Pvt Ltd',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    email: 'contact@abcenterprises.com',
    phone: '+91-22-12345678',
    address: {
      street: '123 Business Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    },
    creditLimit: 100000,
    createdAt: new Date().toISOString(),
  };

  const key = generateKey();
  const fieldsToEncrypt = ['name', 'gstin', 'pan', 'email', 'phone'];

  const encrypted = encryptFields(customer, fieldsToEncrypt, key);

  // ID and non-sensitive fields should remain unchanged
  assertEquals(encrypted.id, customer.id);
  assertEquals(encrypted.creditLimit, customer.creditLimit);

  // Sensitive fields should be encrypted
  fieldsToEncrypt.forEach(field => {
    assert(
      isEncrypted(encrypted[field as keyof typeof encrypted]),
      `${field} should be encrypted`
    );
  });

  // Decrypt and verify
  const decrypted = decryptFields(encrypted, fieldsToEncrypt, key);
  assertEquals(decrypted.name, customer.name);
  assertEquals(decrypted.gstin, customer.gstin);
  assertEquals(decrypted.pan, customer.pan);
  assertEquals(decrypted.email, customer.email);
  assertEquals(decrypted.phone, customer.phone);
});

// Test 5: Multiple Customers (Batch Operation)
test('Encrypt multiple customer records', () => {
  const customers = [
    { id: '1', name: 'Customer A', email: 'a@test.com', phone: '111' },
    { id: '2', name: 'Customer B', email: 'b@test.com', phone: '222' },
    { id: '3', name: 'Customer C', email: 'c@test.com', phone: '333' },
  ];

  const key = generateKey();
  const fields = ['name', 'email', 'phone'];

  // Encrypt all customers
  const encrypted = customers.map(c => encryptFields(c, fields, key));

  // Verify all are encrypted
  encrypted.forEach((c, i) => {
    fields.forEach(field => {
      assert(
        isEncrypted(c[field as keyof typeof c]),
        `Customer ${i} ${field} should be encrypted`
      );
    });
  });

  // Decrypt and verify
  const decrypted = encrypted.map(c => decryptFields(c, fields, key));

  decrypted.forEach((c, i) => {
    assertEquals(c.name, customers[i].name);
    assertEquals(c.email, customers[i].email);
    assertEquals(c.phone, customers[i].phone);
  });
});

// Test 6: Invoice Notes Encryption
test('Encrypt invoice notes', () => {
  const invoice = {
    id: 'inv-001',
    invoiceNumber: 'INV-2024-001',
    amount: 50000,
    notes: 'Customer requested 30 days credit. Special pricing applied due to bulk order.',
    status: 'SENT',
  };

  const key = generateKey();
  const encrypted = encryptFields(invoice, ['notes'], key);

  // Only notes should be encrypted
  assertEquals(encrypted.id, invoice.id);
  assertEquals(encrypted.amount, invoice.amount);
  assert(isEncrypted(encrypted.notes), 'Notes should be encrypted');

  const decrypted = decryptFields(encrypted, ['notes'], key);
  assertEquals(decrypted.notes, invoice.notes);
});

// Test 7: Wrong Key Detection
test('Detect decryption with wrong key', () => {
  const plaintext = 'Secret data';
  const key1 = generateKey();
  const key2 = generateKey();

  const encrypted = encrypt(plaintext, key1);

  let failed = false;
  try {
    decrypt(encrypted, key2);
  } catch (error) {
    failed = true;
  }

  assert(failed, 'Should fail to decrypt with wrong key');
});

// Test 8: Data Integrity (Tamper Detection)
test('Detect tampered ciphertext', () => {
  const plaintext = 'Important data';
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

  assert(failed, 'Should detect tampered ciphertext');
});

// Test 9: Null/Undefined Handling
test('Handle null and undefined values', () => {
  const data = {
    id: '123',
    name: 'Test',
    email: null,
    phone: undefined,
  };

  const key = generateKey();
  const encrypted = encryptFields(data, ['name', 'email', 'phone'], key);
  const decrypted = decryptFields(encrypted, ['name', 'email', 'phone'], key);

  assertEquals(decrypted.name, 'Test');
  assertEquals(decrypted.email, null);
  assertEquals(decrypted.phone, undefined);
});

// Test 10: Large Data
test('Encrypt large text data', () => {
  const largeText = 'A'.repeat(10000);
  const key = generateKey();

  const encrypted = encrypt(largeText, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted.length, 10000);
  assertEquals(decrypted, largeText);
});

// Test 11: Unicode Support
test('Handle unicode characters', () => {
  const unicode = '🔐 Encrypted: 你好 مرحبا नमस्ते';
  const key = generateKey();

  const encrypted = encrypt(unicode, key);
  const decrypted = decrypt(encrypted, key);

  assertEquals(decrypted, unicode);
});

// Test 12: JSON Serialization
test('JSON serialization round-trip', () => {
  const data = 'Test data for JSON';
  const key = generateKey();

  const encryptedJson = encryptToJson(data, key);
  assert(typeof encryptedJson === 'string', 'Should be JSON string');

  const parsed = JSON.parse(encryptedJson);
  assert(parsed.ciphertext, 'Should have ciphertext');
  assert(parsed.iv, 'Should have IV');
  assert(parsed.authTag, 'Should have auth tag');

  const decrypted = decryptFromJson(encryptedJson, key);
  assertEquals(decrypted, data);
});

// Test 13: Encryption Configuration
test('Verify encryption configuration', () => {
  assertEquals(ENCRYPTION_CONFIG.algorithm, 'aes-256-gcm');
  assertEquals(ENCRYPTION_CONFIG.keyLength, 32);
  assertEquals(ENCRYPTION_CONFIG.ivLength, 16);
  assertEquals(ENCRYPTION_CONFIG.authTagLength, 16);
});

// Test 14: Deterministic IV (should be random)
test('IV should be random for each encryption', () => {
  const plaintext = 'Same text';
  const key = generateKey();

  const enc1 = encrypt(plaintext, key);
  const enc2 = encrypt(plaintext, key);

  // IVs should be different
  assert(enc1.iv !== enc2.iv, 'IVs should be different');

  // But both should decrypt correctly
  assertEquals(decrypt(enc1, key), plaintext);
  assertEquals(decrypt(enc2, key), plaintext);
});

// Test 15: Envelope Encryption Simulation
test('Simulate envelope encryption (DEK encrypted with MEK)', () => {
  // Simulate Master Encryption Key
  const mek = generateKey();

  // Simulate Data Encryption Key for tenant
  const dek = generateKey();

  // Encrypt DEK with MEK (envelope encryption)
  const encryptedDek = encrypt(dek.toString('base64'), mek);

  // Verify we can decrypt DEK
  const decryptedDekBase64 = decrypt(encryptedDek, mek);
  const decryptedDek = Buffer.from(decryptedDekBase64, 'base64');

  assert(decryptedDek.equals(dek), 'DEK should be recovered correctly');

  // Now use DEK to encrypt actual data
  const sensitiveData = 'Customer PII data';
  const encryptedData = encrypt(sensitiveData, dek);
  const decryptedData = decrypt(encryptedData, dek);

  assertEquals(decryptedData, sensitiveData);
});

// Print results
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Results:');
console.log(`   Total:  ${testsRun}`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${testsFailed} test(s) failed\n`);
  process.exit(1);
}
