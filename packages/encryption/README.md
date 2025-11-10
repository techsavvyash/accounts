# @accounts/encryption

End-to-end encryption package for the business accounts management platform.

## Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **Envelope Encryption**: Per-tenant Data Encryption Keys (DEK) encrypted with Master Encryption Key (MEK)
- **Field-Level Encryption**: Only sensitive fields are encrypted
- **Key Rotation**: Built-in support for rotating encryption keys
- **Transparent Operations**: Automatic encryption/decryption in middleware

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Master Encryption Key (MEK)           │
│         (Stored in environment variable)        │
└────────────────────┬────────────────────────────┘
                     │ Encrypts/Decrypts
                     ▼
┌─────────────────────────────────────────────────┐
│     Per-Tenant Data Encryption Keys (DEK)       │
│         (Stored encrypted in database)          │
└────────────────────┬────────────────────────────┘
                     │ Encrypts/Decrypts
                     ▼
┌─────────────────────────────────────────────────┐
│            Sensitive Field Data                 │
│  (Customer info, financial data, PII, etc.)     │
└─────────────────────────────────────────────────┘
```

## Usage

### Initialize Master Key

```typescript
import { initializeMasterKey } from '@accounts/encryption';

// On application startup
const masterKey = process.env.MASTER_ENCRYPTION_KEY;
initializeMasterKey(masterKey);
```

### Encrypt/Decrypt Data

```typescript
import { encrypt, decrypt, generateKey } from '@accounts/encryption';

const key = generateKey();
const encrypted = encrypt('sensitive data', key);
const decrypted = decrypt(encrypted, key);
```

### Field-Level Encryption

```typescript
import { encryptModelFields, decryptModelFields } from '@accounts/encryption';

// Before saving to database
const encryptedCustomer = await encryptModelFields(
  db,
  tenantId,
  'Customer',
  customerData
);

// After fetching from database
const decryptedCustomer = await decryptModelFields(
  db,
  tenantId,
  'Customer',
  rawCustomerData
);
```

### Key Management

```typescript
import { generateTenantKey, getTenantKey, rotateTenantKey } from '@accounts/encryption';

// Generate key for new tenant
await generateTenantKey(db, tenantId);

// Get tenant's key
const key = await getTenantKey(db, tenantId);

// Rotate tenant's key
const { oldKey, newKey } = await rotateTenantKey(db, tenantId);
```

## Encrypted Fields

The following fields are encrypted by default:

### Tenant
- gstin, pan, phone, email

### User
- email, fullName

### Customer
- name, gstin, pan, phone, email

### Supplier
- name, gstin, pan, phone, email

### Invoice
- notes

### Journal Entry
- description

### Credit Note
- reason

### Webhook
- url, secret

## Security Considerations

1. **Master Key Protection**: Store MEK in secure environment variables, never commit to code
2. **Key Rotation**: Regularly rotate tenant keys (recommended: annually or after security incidents)
3. **Access Control**: Limit access to encryption keys via RBAC
4. **Audit Logging**: Log all encryption/decryption operations
5. **Backup**: Ensure encrypted backups include encryption keys (stored separately)

## Environment Variables

```bash
# Master Encryption Key (64 hex characters = 32 bytes = 256 bits)
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

Generate a secure key:
```bash
openssl rand -hex 32
```

## Migration

To encrypt existing data:

```typescript
import { initializeAllTenantKeys } from '@accounts/encryption';

// Generate keys for all existing tenants
await initializeAllTenantKeys(db);

// Then run migration script to encrypt existing data
```
