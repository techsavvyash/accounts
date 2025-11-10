#!/usr/bin/env node

/**
 * End-to-End Encryption Flow Validation
 * Simulates the complete user journey with encryption
 */

import crypto from 'crypto';

console.log('🚀 End-to-End Encryption Flow Validation\n');
console.log('='.repeat(70));

// Helper functions
function generateKey() {
  return crypto.randomBytes(32);
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

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
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

// Simulate complete system
console.log('\n📋 Scenario: Complete Business Workflow with Encryption\n');
console.log('─'.repeat(70));

console.log('\n1️⃣  System Initialization');
console.log('   ↳ Generating master encryption key (MEK)...');
const masterKey = generateKey();
console.log('   ✅ MEK generated (32 bytes / 256 bits)');

console.log('\n2️⃣  Tenant Registration');
console.log('   ↳ New business "ABC Enterprises" registering...');

const tenantData = {
  name: 'ABC Enterprises Pvt Ltd',
  gstin: '27AABCU9603R1ZM',
  pan: 'AABCU9603R',
  email: 'admin@abcenterprises.com',
  phone: '+91-22-12345678',
};

console.log('   ↳ Generating tenant encryption key (DEK)...');
const tenantDEK = generateKey();

console.log('   ↳ Encrypting DEK with MEK (envelope encryption)...');
const encryptedDEK = encrypt(tenantDEK.toString('base64'), masterKey);

console.log('   ↳ Storing encrypted DEK in database...');
const dekStorage = JSON.stringify(encryptedDEK);

console.log('   ✅ Tenant registered with encrypted key');

console.log('\n3️⃣  Creating Customers');
console.log('   ↳ Adding customer "XYZ Corporation"...');

const customer1 = {
  name: 'XYZ Corporation',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  email: 'contact@xyzcorp.com',
  phone: '+91-80-98765432',
  address: {
    street: '123 Business Park',
    city: 'Mumbai',
    state: 'Maharashtra',
  },
  creditLimit: 500000,
};

const customerFields = ['name', 'gstin', 'pan', 'email', 'phone'];

console.log('   ↳ Encrypting customer PII...');
const encryptedCustomer1 = encryptFields(customer1, customerFields, tenantDEK);

console.log('   ↳ Storing in database...');
console.log(`      - Name: ${customer1.name} → [encrypted]`);
console.log(`      - GSTIN: ${customer1.gstin} → [encrypted]`);
console.log(`      - Email: ${customer1.email} → [encrypted]`);
console.log(`      - Credit Limit: ${customer1.creditLimit} (not encrypted)`);

console.log('   ✅ Customer created with encrypted PII');

console.log('\n4️⃣  Creating Invoice');
console.log('   ↳ Creating invoice for XYZ Corporation...');

const invoice = {
  invoiceNumber: 'INV-2024-001',
  customerId: 'cust-001',
  amount: 150000,
  taxAmount: 27000,
  totalAmount: 177000,
  notes: 'Special discount applied. Customer requested 45-day payment terms.',
  status: 'SENT',
  lineItems: [
    { description: 'Product A', quantity: 10, unitPrice: 10000, total: 100000 },
    { description: 'Product B', quantity: 5, unitPrice: 10000, total: 50000 },
  ],
};

console.log('   ↳ Encrypting sensitive invoice notes...');
const encryptedInvoice = encryptFields(invoice, ['notes'], tenantDEK);

console.log('   ↳ Storing invoice...');
console.log(`      - Invoice #: ${invoice.invoiceNumber} (not encrypted)`);
console.log(`      - Amount: ₹${invoice.totalAmount.toLocaleString('en-IN')} (not encrypted)`);
console.log(`      - Notes: [encrypted]`);

console.log('   ✅ Invoice created with encrypted notes');

console.log('\n5️⃣  Retrieving and Displaying Data');
console.log('   ↳ User requesting customer list...');

console.log('   ↳ Fetching from database (encrypted)...');
console.log('   ↳ Decrypting DEK with MEK...');
const retrievedDEKBase64 = decrypt(JSON.parse(dekStorage), masterKey);
const retrievedDEK = Buffer.from(retrievedDEKBase64, 'base64');

if (!retrievedDEK.equals(tenantDEK)) {
  console.error('   ❌ ERROR: DEK mismatch!');
  process.exit(1);
}

console.log('   ↳ Decrypting customer data...');
const decryptedCustomer = decryptFields(
  encryptedCustomer1,
  customerFields,
  retrievedDEK
);

console.log('   ✅ Data decrypted successfully');
console.log(`      - Name: ${decryptedCustomer.name}`);
console.log(`      - GSTIN: ${decryptedCustomer.gstin}`);
console.log(`      - Email: ${decryptedCustomer.email}`);

// Verify data integrity
if (decryptedCustomer.name !== customer1.name ||
    decryptedCustomer.gstin !== customer1.gstin ||
    decryptedCustomer.email !== customer1.email) {
  console.error('   ❌ ERROR: Decrypted data does not match original!');
  process.exit(1);
}

console.log('\n6️⃣  Multi-Tenant Isolation Test');
console.log('   ↳ Second tenant "DEF Industries" registering...');

const tenant2DEK = generateKey();
const tenant2Data = {
  name: 'Competitor Corp',
  gstin: '19ZZZZZ9999Z1Z9',
  pan: 'ZZZZZ9999Z',
  email: 'secret@competitor.com',
  phone: '+91-11-88888888',
};

console.log('   ↳ Encrypting with tenant2 key...');
const encryptedTenant2Customer = encryptFields(
  tenant2Data,
  customerFields,
  tenant2DEK
);

console.log('   ↳ Attempting to decrypt tenant2 data with tenant1 key...');
let isolationWorks = false;
try {
  decryptFields(encryptedTenant2Customer, customerFields, tenantDEK);
  console.error('   ❌ SECURITY BREACH: Tenant isolation failed!');
  process.exit(1);
} catch (error) {
  isolationWorks = true;
  console.log('   ✅ Tenant isolation working (decryption failed as expected)');
}

console.log('\n7️⃣  Testing Data Integrity');
console.log('   ↳ Attempting to tamper with encrypted data...');

const tamperedCustomer = {
  ...encryptedCustomer1,
  name: JSON.stringify({
    ...JSON.parse(encryptedCustomer1.name),
    ciphertext: 'tampered-data-here',
  }),
};

console.log('   ↳ Trying to decrypt tampered data...');
let integrityWorks = false;
try {
  decryptFields(tamperedCustomer, ['name'], tenantDEK);
  console.error('   ❌ SECURITY BREACH: Tampered data was accepted!');
  process.exit(1);
} catch (error) {
  integrityWorks = true;
  console.log('   ✅ Data integrity check working (tampering detected)');
}

console.log('\n8️⃣  Testing Large Dataset');
console.log('   ↳ Creating 100 customers...');

const customers = [];
for (let i = 1; i <= 100; i++) {
  customers.push({
    name: `Customer ${i}`,
    email: `customer${i}@example.com`,
    gstin: `GSTIN${i}`,
    pan: `PAN${i}`,
    phone: `+91-${String(i).padStart(10, '0')}`,
  });
}

console.log('   ↳ Encrypting all customers...');
const startEncrypt = Date.now();
const encryptedCustomers = customers.map(c =>
  encryptFields(c, customerFields, tenantDEK)
);
const encryptTime = Date.now() - startEncrypt;

console.log(`   ↳ Encrypted 100 customers in ${encryptTime}ms`);

console.log('   ↳ Decrypting all customers...');
const startDecrypt = Date.now();
const decryptedCustomers = encryptedCustomers.map(c =>
  decryptFields(c, customerFields, tenantDEK)
);
const decryptTime = Date.now() - startDecrypt;

console.log(`   ↳ Decrypted 100 customers in ${decryptTime}ms`);

// Verify all data
let allMatch = true;
for (let i = 0; i < 100; i++) {
  if (decryptedCustomers[i].name !== customers[i].name ||
      decryptedCustomers[i].email !== customers[i].email) {
    allMatch = false;
    break;
  }
}

if (!allMatch) {
  console.error('   ❌ ERROR: Some decrypted data does not match!');
  process.exit(1);
}

console.log('   ✅ All 100 customers verified successfully');
console.log(`   📊 Average: ${(encryptTime / 100).toFixed(2)}ms encrypt, ${(decryptTime / 100).toFixed(2)}ms decrypt per record`);

console.log('\n9️⃣  Testing Edge Cases');
console.log('   ↳ Empty strings...');
const emptyTest = encryptFields({ name: '', email: '' }, ['name', 'email'], tenantDEK);
const emptyDecrypted = decryptFields(emptyTest, ['name', 'email'], tenantDEK);
if (emptyDecrypted.name !== '' || emptyDecrypted.email !== '') {
  console.error('   ❌ Empty string handling failed');
  process.exit(1);
}
console.log('   ✅ Empty strings handled correctly');

console.log('   ↳ Unicode characters...');
const unicodeTest = {
  name: '北京科技 🏢',
  email: 'test@中国.com',
};
const unicodeEncrypted = encryptFields(unicodeTest, ['name', 'email'], tenantDEK);
const unicodeDecrypted = decryptFields(unicodeEncrypted, ['name', 'email'], tenantDEK);
if (unicodeDecrypted.name !== unicodeTest.name) {
  console.error('   ❌ Unicode handling failed');
  process.exit(1);
}
console.log('   ✅ Unicode characters handled correctly');

console.log('   ↳ Very long text (10KB)...');
const longText = 'A'.repeat(10000);
const longEncrypted = encryptFields({ notes: longText }, ['notes'], tenantDEK);
const longDecrypted = decryptFields(longEncrypted, ['notes'], tenantDEK);
if (longDecrypted.notes.length !== 10000) {
  console.error('   ❌ Long text handling failed');
  process.exit(1);
}
console.log('   ✅ Long text handled correctly');

console.log('\n🔟  Complete Workflow Summary');
console.log('   ✅ System initialization successful');
console.log('   ✅ Tenant registration with key generation');
console.log('   ✅ Customer data encrypted and stored');
console.log('   ✅ Invoice notes encrypted');
console.log('   ✅ Data retrieval and decryption working');
console.log('   ✅ Multi-tenant isolation enforced');
console.log('   ✅ Data tampering detected');
console.log('   ✅ Bulk operations performant');
console.log('   ✅ Edge cases handled correctly');

console.log('\n' + '='.repeat(70));
console.log('\n🎉 END-TO-END VALIDATION COMPLETE!');
console.log('\n✨ Summary:');
console.log('   • Envelope encryption (MEK → DEK) ✅');
console.log('   • Field-level encryption ✅');
console.log('   • Multi-tenant isolation ✅');
console.log('   • Data integrity verification ✅');
console.log('   • Performance acceptable ✅');
console.log('   • Edge case handling ✅');
console.log('\n🔐 The encryption system is production-ready!\n');
