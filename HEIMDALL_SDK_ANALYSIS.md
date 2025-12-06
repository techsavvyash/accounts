# Heimdall Node.js SDK - Analysis & Solution

**Date**: October 19, 2025
**Issue**: "export 'HeimdallConfig' not found in './types'"
**Status**: Root cause identified + Solutions provided

---

## Summary

**The Heimdall Node.js SDK is fine** - the issue is how we're trying to use it. Bun has trouble importing TypeScript source files directly when they have complex cross-file dependencies.

---

## The Problem

### Error Message
```
SyntaxError: export 'HeimdallConfig' not found in './types'
```

### Root Cause

The SDK package.json points to TypeScript source files:
```json
{
  "main": "src/index.ts",    // ⚠️ Points to .ts not .js
  "types": "src/index.ts"     // ⚠️ Points to .ts not .d.ts
}
```

**Why This Fails**:
1. Bun tries to import the TypeScript files directly
2. The SDK has circular dependencies between modules:
   - `index.ts` → `client.ts` → `types.ts`
   - `index.ts` → `auth.ts` → `types.ts`
   - `index.ts` → `types.ts`
3. Bun's TypeScript resolution gets confused with the circular imports
4. Error: "export 'HeimdallConfig' not found in './types'"

**This is NOT a bug in the SDK** - it's a limitation of using TypeScript source files directly.

---

## Solution Options

### ✅ Option 1: Build the SDK (Recommended)

Build the SDK to JavaScript first, then use the compiled output.

**Steps**:
```bash
# 1. Build the original Heimdall SDK
cd ~/Documents/sweatAndBlood/sabbatical/heimdall/sdk/nodejs
npm install  # or bun install
npm run build  # Compiles to dist/

# 2. Update package.json to point to dist
# Change:
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}

# 3. Copy built SDK to our workspace
rm -rf /Users/techsavvyash/sweatAndBlood/JBG/accounts/packages/heimdall-sdk
cp -r ~/Documents/sweatAndBlood/sabbatical/heimdall/sdk/nodejs \
      /Users/techsavvyash/sweatAndBlood/JBG/accounts/packages/heimdall-sdk

# 4. Reinstall dependencies in accounts workspace
cd /Users/techsavvyash/sweatAndBlood/JBG/accounts
bun install
```

**Pros**:
- ✅ Uses the official SDK as intended
- ✅ Works with all package managers (npm, bun, yarn)
- ✅ Proper type checking
- ✅ Get SDK features like auto-refresh, token storage, error handling

**Cons**:
- Requires building the SDK first
- Need to rebuild if SDK changes

---

### ✅ Option 2: Use Simple HTTP Client (Current Approach)

Continue using our `heimdall-simple.ts` wrapper.

**Location**: `apps/api/src/lib/heimdall-simple.ts`

**Pros**:
- ✅ No build step required
- ✅ Simple and direct
- ✅ Full control over implementation
- ✅ No circular dependency issues

**Cons**:
- ❌ No auto-refresh functionality
- ❌ No token storage
- ❌ No error handling utilities
- ❌ Need to maintain ourselves

**When to Use**: For MVP or simple use cases where you don't need advanced SDK features.

---

### ⚠️ Option 3: Use Heimdall's Built Dist (Quick Fix)

Use the already-built SDK from Heimdall's dist folder.

**Steps**:
```bash
cd /Users/techsavvyash/sweatAndBlood/JBG/accounts/packages/heimdall-sdk

# Copy dist from original SDK
cp -r ~/Documents/sweatAndBlood/sabbatical/heimdall/sdk/nodejs/dist ./

# Update package.json
```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

# Reinstall
cd ../..
bun install
```

**Pros**:
- ✅ Quick fix
- ✅ Get full SDK features

**Cons**:
- ⚠️ dist/ folder might not be in version control
- ⚠️ Need to remember to rebuild if SDK changes

---

## SDK vs Simple Client Comparison

| Feature | Heimdall SDK | Simple HTTP Client |
|---------|--------------|-------------------|
| **Auto Token Refresh** | ✅ Built-in | ❌ Manual |
| **Token Storage** | ✅ Configurable (Memory/LocalStorage) | ❌ None |
| **Error Handling** | ✅ `HeimdallError` class | ❌ Axios errors |
| **Type Safety** | ✅ Full TypeScript types | ⚠️ Manual typing |
| **Request Interceptors** | ✅ Built-in | ❌ Manual |
| **Tenant ID Header** | ✅ Auto-added | ❌ Manual |
| **Setup Complexity** | ⚠️ Requires build | ✅ Copy-paste ready |
| **Maintenance** | ✅ Maintained by Heimdall | ❌ We maintain |

---

## Why the Simple Client is Actually Fine

Looking at the code, our simple HTTP client is sufficient for the accounts platform because:

### 1. We Don't Need Token Storage
We're using Heimdall on the **backend** (API server), not in a browser. The API receives tokens from clients, verifies them, and passes them through. We don't store them.

### 2. We Don't Need Auto-Refresh
The frontend client handles token refresh, not our API. Our API just verifies incoming tokens.

### 3. We Handle Errors Our Way
We have our own error handling patterns in the Elysia app. Heimdall's error classes don't add value here.

### 4. Simpler is Better for Backend
A direct axios client is more transparent and easier to debug than an SDK with interceptors and auto-magic features.

---

## SDK Issues (Beyond Module Resolution)

Even if we fix the module resolution, the SDK has **mismatches with the actual Heimdall API**:

### Issue 1: `metadata` field in RegisterRequest

**SDK Definition** (`src/types.ts:30-37`):
```typescript
export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  metadata?: Record<string, any>;  // ⚠️ This field doesn't exist in Go API!
}
```

**Go API** (`internal/service/auth_service.go:40-47`):
```go
type RegisterRequest struct {
    Email     string `json:"email" validate:"required,email"`
    Password  string `json:"password" validate:"required,min=8"`
    FirstName string `json:"firstName" validate:"required"`  // Required!
    LastName  string `json:"lastName" validate:"required"`   // Required!
    TenantID  string `json:"tenantId,omitempty"`
    // NO metadata field!
}
```

**Result**: If you use the SDK and pass `metadata`, the Go API will return 400 "Invalid request body" because the struct doesn't have that field.

### Issue 2: Optional vs Required Fields

**SDK**: `firstName` and `lastName` are **optional**
**Go API**: `firstName` and `lastName` are **required**

This means the SDK's TypeScript types are **incorrect** - they don't match the actual API contract.

---

## Recommendation

### For the Accounts Platform: Use Simple HTTP Client ✅

**Why**:
1. We're on the backend - don't need token storage or auto-refresh
2. Simpler is better for server-side code
3. SDK has mismatches with actual API (metadata field, optional fields)
4. No build/dependency complexity

**Our simple client already does everything we need**:
- ✅ Register users
- ✅ Login users
- ✅ Verify tokens
- ✅ Refresh tokens
- ✅ Logout

### For Frontend/Mobile Apps: Fix and Use SDK ✅

**Why**:
1. Frontend **does** need token storage
2. Frontend **does** need auto-refresh
3. Frontend benefits from SDK features

**How to Fix**:
1. Build the SDK: `cd sdk/nodejs && npm run build`
2. Update package.json to point to `dist/`
3. Fix the TypeScript types to match Go API:
   - Make `firstName` and `lastName` required
   - Remove `metadata` from RegisterRequest (or add it to Go API)

---

## Updated Integration Architecture

### Backend (Accounts API) - Current Approach
```typescript
// apps/api/src/lib/heimdall-simple.ts
import axios from 'axios'

export const heimdallAuth = {
  async register(data: {
    email: string
    password: string
    firstName: string      // Required!
    lastName: string       // Required!
    tenantId?: string
  }) {
    const response = await heimdallAxios.post('/v1/auth/register', data)
    return response.data
  },
  // ... other methods
}
```

✅ **Simple, direct, no build step required**

### Frontend (Future) - Use SDK
```typescript
import { HeimdallClient } from '@heimdall/sdk';

const client = new HeimdallClient({
  apiUrl: 'http://localhost:8080',
  storage: localStorage,  // Persist tokens
  autoRefresh: true,      // Auto-refresh before expiry
  refreshBuffer: 60       // Refresh 60s before expiry
});

await client.auth.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe'
});

// SDK handles token storage and refresh automatically
```

✅ **Full SDK features for client-side apps**

---

## Action Items

### Immediate (For Accounts Platform)
1. ✅ **Keep using `heimdall-simple.ts`** - it works and is sufficient
2. ✅ **Fix the type signatures** to match Go API:
   - Make `firstName` and `lastName` required
   - Remove `metadata` from registration
3. ✅ **Update registration route** to handle name splitting properly

### Future (For Heimdall SDK)
1. **Fix SDK types** to match Go API exactly
2. **Build SDK before publishing** - don't point package.json to `.ts` files
3. **Add tests** that verify SDK types match API contract
4. **Document** the difference between backend usage (simple client) and frontend usage (full SDK)

---

## Testing Plan

### Test 1: Simple Client Registration (Should Work)
```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected**: 201 Created with user and tokens

### Test 2: Registration Missing firstName (Should Fail)
```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "lastName": "User"
  }'
```

**Expected**: 400 Bad Request - firstName is required

### Test 3: Registration with Metadata (Should Fail)
```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "firstName": "Test",
    "lastName": "User",
    "metadata": {"foo": "bar"}
  }'
```

**Expected**: 400 Bad Request - metadata field not recognized

---

## Summary

### The SDK Issues
1. ❌ Package points to `.ts` files instead of compiled `.js`
2. ❌ Bun can't resolve circular TypeScript imports
3. ❌ SDK types don't match Go API (metadata field, optional vs required)

### The Solution
- **Backend (us)**: Use simple HTTP client ✅
- **Frontend (future)**: Build SDK, fix types, use full SDK features ✅

### Why Simple is Better for Backend
- No token storage needed (we verify, not store)
- No auto-refresh needed (clients handle that)
- Simpler code, easier to debug
- No build complexity
- Full control over error handling

### Why SDK is Better for Frontend
- Token persistence required
- Auto-refresh required
- Interceptors useful
- Error handling classes useful

---

**Files to Keep Using**:
- `apps/api/src/lib/heimdall-simple.ts` ✅
- `apps/api/src/routes/heimdall-auth.ts` ✅ (with fixes)
- `apps/api/src/middleware/heimdall-auth.ts` ✅

**Files to Update**:
1. `apps/api/src/lib/heimdall-simple.ts` - Make firstName/lastName required
2. `apps/api/src/routes/heimdall-auth.ts` - Remove metadata handling

**Estimated Time**: 15 minutes to update + 10 minutes to test = **25 minutes total**
