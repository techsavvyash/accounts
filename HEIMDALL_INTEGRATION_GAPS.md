# Heimdall Integration - Gap Analysis

**Date**: October 19, 2025
**Status**: Investigation Complete

## Executive Summary

After investigating the Heimdall service and integration, I discovered that **Heimdall IS working** but our integration code has some gaps that need to be addressed. The registration endpoint is functional, but there are specific requirements that our current integration doesn't meet.

## Key Findings

### ✅ What's Working in Heimdall

1. **Server Infrastructure**: Fully operational
   - Heimdall server running on port 8080
   - PostgreSQL database connected (database: `heimdall`)
   - Redis connected
   - FusionAuth client initialized
   - JWT service initialized

2. **Database Schema**: Complete and seeded
   - Default tenant exists: `2fdbf8a4-5d14-4474-b042-1d2460207f50`
   - Tables: `users`, `tenants`, `roles`, `permissions`, `user_roles`, `role_permissions`, `audit_logs`

3. **API Endpoints**: All configured
   - Health check: `GET /health` ✅ Working
   - Registration: `POST /v1/auth/register` ⚠️ Returns 400 (see gaps below)
   - Login: `POST /v1/auth/login`
   - Logout: `POST /v1/auth/logout`
   - Refresh: `POST /v1/auth/refresh`

4. **Sample App**: Fully functional
   - Located at: `~/Documents/sweatAndBlood/sabbatical/heimdall/examples/sample-app`
   - Running on port 4000
   - Contains working registration/login UI
   - Uses browser-compatible SDK

### ⚠️ Gaps in Our Integration

#### Gap 1: Required Fields in RegisterRequest

**Issue**: Heimdall's `RegisterRequest` struct requires `firstName` and `lastName` as **required fields** (not optional).

```go
// From internal/service/auth_service.go:41-47
type RegisterRequest struct {
    Email     string `json:"email" validate:"required,email"`
    Password  string `json:"password" validate:"required,min=8"`
    FirstName string `json:"firstName" validate:"required"`  // ⚠️ REQUIRED
    LastName  string `json:"lastName" validate:"required"`   // ⚠️ REQUIRED
    TenantID  string `json:"tenantId,omitempty"`
}
```

**Our Current Code** (`apps/api/src/lib/heimdall-simple.ts:17-26`):
```typescript
async register(data: {
  email: string
  password: string
  firstName?: string  // ⚠️ Optional - should be required!
  lastName?: string   // ⚠️ Optional - should be required!
  metadata?: Record<string, any>
}) {
  const response = await heimdallAxios.post('/v1/auth/register', data)
  return response.data
}
```

**Fix Required**:
- Make `firstName` and `lastName` **required** in our TypeScript types
- Update the registration route to ensure these fields are always provided
- Split `fullName` into `firstName` and `lastName` properly

#### Gap 2: Metadata Not Supported in Registration

**Issue**: Heimdall's `RegisterRequest` doesn't have a `metadata` field. Metadata is stored separately after user creation.

**Our Current Code** (`apps/api/src/routes/heimdall-auth.ts:26-37`):
```typescript
const heimdallResponse = await heimdallAuth.register({
  email,
  password,
  firstName,
  lastName,
  metadata: {  // ⚠️ This field doesn't exist in Heimdall's RegisterRequest!
    tenantName,
    gstin,
    pan,
    platform: 'accounts-management'
  }
})
```

**Fix Required**:
- Remove `metadata` from the registration request
- Store tenant-specific metadata (tenantName, gstin, pan) in **our local database** only
- Use the `tenantId` field in RegisterRequest if we want to assign a specific tenant

#### Gap 3: TenantID Handling

**Issue**: Heimdall expects either:
1. No `tenantId` → assigns to "default" tenant
2. Valid UUID of existing tenant

**Our Current Approach**:
- We're creating a new tenant in our local database
- We're not providing a `tenantId` to Heimdall
- Heimdall will assign user to default tenant
- Our local DB will have a different tenant

**Fix Required**:
- **Option A**: Create tenant in Heimdall first (using `/v1/tenants` endpoint), then use that tenant ID for registration
- **Option B**: Always use Heimdall's default tenant, store our tenant relationship only in local DB
- **Recommended**: Option B for simpler integration

#### Gap 4: Response Structure Mismatch

**Issue**: Heimdall returns user data in a specific structure, but we're assuming a different format.

**Heimdall's Actual Response** (from internal/service/auth_service.go:56-63):
```go
type AuthResponse struct {
    AccessToken  string    `json:"accessToken"`
    RefreshToken string    `json:"refreshToken"`
    TokenType    string    `json:"tokenType"`
    ExpiresIn    int64     `json:"expiresIn"`
    User         *UserInfo `json:"user"`
}

type UserInfo struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    FirstName string `json:"firstName,omitempty"`
    LastName  string `json:"lastName,omitempty"`
    TenantID  string `json:"tenantId"`
}
```

**Our Current Code** assumes:
```typescript
const heimdallUser = heimdallResponse.data.user
const tenantId = heimdallUser.tenantId  // ⚠️ Need to verify this exists
```

**Fix Required**:
- Update our type definitions to match Heimdall's actual response
- Handle `tenantId` from Heimdall's response properly

#### Gap 5: Error Code 400 "Invalid Request Body"

**Root Cause**: Based on the Fiber `BodyParser` code in `internal/api/auth_handler.go:24-34`, the 400 error occurs when:
1. JSON parsing fails
2. Content-Type header is missing/incorrect
3. Request body is malformed
4. **Validation fails** (most likely our case)

**Why Our Requests Fail**:
1. We're sending `metadata` field which doesn't exist in `RegisterRequest`
2. This causes the struct validation to fail
3. Fiber returns 400 "Invalid request body"

**Tests Performed**:
```bash
# All returned 400 because of metadata/optional firstName/lastName
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","firstName":"Test","lastName":"User"}'
```

### 🎯 What Actually Works

Based on the sample app (`examples/sample-app/public/heimdall-client.js:59-68`), here's the **correct** registration request:

```javascript
await heimdall.auth.register({
  email,                              // Required
  password,                           // Required
  firstName: firstName || undefined,  // Required (but can be empty string)
  lastName: lastName || undefined,    // Required (but can be empty string)
  metadata: {                         // ⚠️ NOT sent to Heimdall!
    source: 'web'
  }
})
```

**Note**: The sample app's SDK likely handles metadata separately or doesn't send it to the registration endpoint.

## Required Fixes

### Fix 1: Update `heimdall-simple.ts`

```typescript
export const heimdallAuth = {
  async register(data: {
    email: string
    password: string
    firstName: string      // Make required
    lastName: string       // Make required
    tenantId?: string      // Optional - defaults to "default" tenant
  }) {
    const response = await heimdallAxios.post('/v1/auth/register', {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.tenantId && { tenantId: data.tenantId })
    })
    return response.data
  },
  // ... rest of methods
}
```

### Fix 2: Update `heimdall-auth.ts` Routes

```typescript
app.api/src/routes/heimdall-auth.ts:14-112

POST('/register', async ({ body, set, posthog }) => {
  try {
    const { email, password, fullName, tenantName, gstin, pan } = body

    // Split fullName properly
    const nameParts = fullName?.trim().split(/\s+/) || []
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Validate firstName and lastName are not empty
    if (!firstName) {
      throw new Error('First name is required')
    }

    // Register with Heimdall (no metadata, no tenantId)
    const heimdallResponse = await heimdallAuth.register({
      email,
      password,
      firstName,
      lastName
      // Note: Heimdall will assign to default tenant
    })

    if (!heimdallResponse.success || !heimdallResponse.data) {
      throw new Error(heimdallResponse.error?.message || 'Registration failed')
    }

    const { user, accessToken, refreshToken } = heimdallResponse.data

    // Create OUR tenant in local database (independent of Heimdall's tenant)
    const tenant = await db.createTenantWithDefaults({
      name: tenantName,
      gstin,
      pan
    })

    // Create user in local database with Heimdall's user ID
    const localUser = await prisma.user.create({
      data: {
        id: user.id,  // Use Heimdall's user ID
        email: user.email,
        passwordHash: '', // Managed by Heimdall
        fullName: `${user.firstName} ${user.lastName}`.trim()
      }
    })

    // Associate user with OUR tenant
    const ownerRole = await prisma.role.findFirst({
      where: { name: 'owner', tenantId: null }
    })

    if (!ownerRole) {
      throw new Error('Owner role not found. Please run database seed.')
    }

    await prisma.tenantUser.create({
      data: {
        userId: localUser.id,
        tenantId: tenant.id,
        roleId: ownerRole.id
      }
    })

    // Track registration
    posthog?.track('user_registered', {
      userId: localUser.id,
      tenantId: tenant.id,
      tenantName,
      authProvider: 'heimdall'
    })

    set.status = 201
    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: localUser.id,
          email: localUser.email,
          fullName: localUser.fullName
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          gstin: tenant.gstin
        },
        accessToken,
        refreshToken,
        tokenType: 'Bearer'
      }
    }

  } catch (error: any) {
    console.error('Heimdall registration error:', error)
    set.status = error.statusCode || 500
    return {
      success: false,
      error: error.code || 'REGISTRATION_FAILED',
      message: error.message || 'Failed to create account'
    }
  }
})
```

### Fix 3: Update Request Validation Schema

```typescript
{
  body: t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
    fullName: t.String({ minLength: 1 }),  // Ensure not empty
    tenantName: t.String(),
    gstin: t.Optional(t.String()),
    pan: t.Optional(t.String())
  })
}
```

## Testing Plan

Once fixes are applied:

### Test 1: Direct Heimdall Registration
```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "directtest@example.com",
    "password": "SecurePassword123!",
    "firstName": "Direct",
    "lastName": "Test"
  }'
```

**Expected**: 201 Created with user data and tokens

### Test 2: Accounts API Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "SecurePassword123!",
    "fullName": "API Test User",
    "tenantName": "Test Company",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

**Expected**: 201 Created with user, tenant, and tokens

### Test 3: Login Flow
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "apitest@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected**: 200 OK with user data, tenant, permissions, and tokens

### Test 4: Protected Endpoint
```bash
TOKEN="<access_token_from_login>"
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: 200 OK with user profile

## Architecture Clarification

### Two-Tenant System

Our integration creates a **two-tenant architecture**:

1. **Heimdall Tenant**: User belongs to Heimdall's "default" tenant
   - Manages authentication
   - Stores user credentials
   - Issues JWT tokens

2. **Accounts Platform Tenant**: User belongs to their business tenant
   - Manages business data (invoices, inventory, etc.)
   - Stores business metadata (GSTIN, PAN, etc.)
   - Handles RBAC for business operations

**Why This Works**:
- Heimdall handles auth (SSO, MFA, password management)
- Accounts platform handles business logic
- User ID is shared between both systems
- Each system has its own tenant concept

## Summary

### Current Status
- ❌ Registration failing with 400 - Invalid Request Body
- ✅ Heimdall infrastructure fully operational
- ✅ Database and services connected
- ✅ Sample app demonstrates correct usage

### Root Causes
1. Sending `metadata` field that doesn't exist in Heimdall's schema
2. Making `firstName`/`lastName` optional when they're required
3. Not handling tenant assignment correctly

### Next Steps
1. Apply fixes to `heimdall-simple.ts` (3 files to update)
2. Apply fixes to `heimdall-auth.ts` routes
3. Run Test Plan (4 tests)
4. Update documentation with correct API structure
5. Consider implementing tenant creation in Heimdall if multi-tenancy is needed

### Recommendation

**For MVP**: Use the simplified two-tenant approach (Heimdall default tenant + our business tenants). This allows us to:
- Get authentication working immediately
- Leverage Heimdall for auth features (OAuth, MFA, etc.)
- Maintain full control over business logic and data

**For Future**: If true multi-tenancy in Heimdall is needed, implement tenant creation via `/v1/tenants` API before user registration.

---

**Files to Update**:
1. `apps/api/src/lib/heimdall-simple.ts` - Fix type signatures
2. `apps/api/src/routes/heimdall-auth.ts` - Fix registration logic
3. `apps/api/src/middleware/heimdall-auth.ts` - Verify response handling

**Estimated Time**: 30 minutes to implement + 15 minutes to test = 45 minutes total
