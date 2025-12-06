# Migration to Heimdall-Only Authentication

## Summary

The Accounts Management Platform has been migrated to use **Heimdall authentication exclusively**. The original JWT-based authentication has been removed.

## Changes Made

### 1. Main Entry Point (`src/index.ts`)
- **Before**: Used local JWT authentication with `@elysiajs/jwt` and `@elysiajs/cookie`
- **After**: Now uses Heimdall authentication exclusively
- Updated to use `heimdallAuthRoutes` and `heimdallAuthMiddleware`

### 2. Authentication Routes
- **Removed**: `src/routes/auth.ts` (backed up to `auth.ts.backup`)
- **Now Using**: `src/routes/heimdall-auth.ts` exclusively

### 3. Authentication Middleware
- **Updated**: `src/middleware/auth.ts`
  - Removed JWT-based `authMiddleware` function
  - Kept helper functions: `requirePermission`, `requireOwner`, etc.
  - Added deprecation notice
- **Now Using**: `src/middleware/heimdall-auth.ts` for authentication

### 4. Dependencies
**Removed:**
- `@elysiajs/jwt` - No longer needed
- `@elysiajs/cookie` - No longer needed for auth
- `bcryptjs` - Password hashing now handled by Heimdall/FusionAuth

**Added:**
- `@accounts/heimdall` - Heimdall SDK
- `axios` - HTTP client for Heimdall

### 5. Configuration (`src/config.ts`)
**Removed:**
- `JWT_SECRET`
- `JWT_EXPIRY`
- `REFRESH_TOKEN_EXPIRY`
- `USE_HEIMDALL` (always true now)

**Kept:**
- `HEIMDALL_URL` (required)
- `HEIMDALL_TENANT_ID` (optional)

### 6. Scripts (`package.json`)
**Removed:**
- `dev:heimdall` - No longer needed (dev uses Heimdall by default)

**Added:**
- `test:heimdall` - Run Heimdall integration tests

### 7. Files Removed/Archived
- `src/index-heimdall.ts` - Merged into `index.ts`
- `src/routes/auth.ts` - Backed up to `auth.ts.backup`

## What Stays the Same

### 1. Local Database Structure
- User, Tenant, Role, Permission tables unchanged
- RBAC system remains the same
- Permission checking helpers still work

### 2. API Endpoints
- All protected endpoints remain unchanged
- Products, Inventory, Invoices, GST, etc. - no changes needed
- Only auth endpoints changed (but same functionality)

### 3. Request Context
- `store.userId`, `store.tenantId`, `store.roleId` still populated
- `store.permissions` array still available
- Permission middleware still works

## New Authentication Endpoints

All at `/api/auth/`:

- `POST /register` - Register new user (via Heimdall)
- `POST /login` - Login (via Heimdall)
- `POST /logout` - Logout (via Heimdall)
- `POST /refresh` - Refresh access token
- `GET /profile` - Get user profile

## For Developers

### Running the Application

**Prerequisites:**
1. Heimdall server must be running on `localhost:8080`

```bash
# Terminal 1: Start Heimdall
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make dev && make build && make run

# Terminal 2: Start Accounts API
cd ~/sweatAndBlood/JBG/accounts/apps/api
bun run dev

# Terminal 3: Test
bun run test:heimdall
```

### Environment Variables

Required:
```bash
HEIMDALL_URL=http://localhost:8080  # Default, can override
```

Optional:
```bash
HEIMDALL_TENANT_ID=your-tenant-id   # For multi-tenant Heimdall setups
```

### Code Changes Needed

#### In Protected Routes - No Changes!
```typescript
// This still works exactly the same
export const productRoutes = new Elysia()
  .get('/products', async ({ store }) => {
    // store.userId, store.tenantId still available
    // store.permissions still works
    const products = await prisma.product.findMany({
      where: { tenantId: store.tenantId }
    })
    return { products }
  })
```

#### In Frontend/Client Code - Update Auth Calls

**Before (JWT):**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password, tenantId })
})
```

**After (Heimdall):**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
  // No tenantId needed - user's tenant is auto-fetched
})

// Response format changed slightly:
// { success: true, data: { user, tenant, accessToken, refreshToken } }
```

**Registration:**
```typescript
// Before
const response = await fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email, password, fullName, tenantName, gstin, pan
  })
})

// After - Same format!
// Just uses Heimdall under the hood
```

### Testing

**Health Check:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy","authProvider":"heimdall",...}
```

**Integration Tests:**
```bash
cd apps/api
bun run test:heimdall
```

## For Existing Users

### User Data Migration

If you have existing users in the database:

**Option 1: Let users re-register**
- Existing local records will be updated
- Users create new accounts via Heimdall
- Their Heimdall user ID will replace local ID

**Option 2: Manual migration** (if needed)
1. Export users from local database
2. Import to Heimdall via API
3. Update local user records with Heimdall IDs

**Option 3: Keep existing users**
- The auto-provisioning in `heimdallAuthMiddleware` will create local records
- Users authenticated via Heimdall will have records synced to local DB

### Password Reset
- Old password hashes in local DB are ignored
- Passwords now managed by FusionAuth via Heimdall
- Users can reset passwords through FusionAuth UI or Heimdall API

## Benefits of This Migration

### 1. Simplified Codebase
- Removed ~400 lines of JWT auth code
- One less dependency (`@elysiajs/jwt`)
- Cleaner configuration

### 2. Better Security
- FusionAuth handles password storage and validation
- Enterprise-grade security features
- Regular security updates from FusionAuth

### 3. More Features
- SSO (Single Sign-On) capability
- Social login (Google, GitHub, etc.)
- Multi-factor authentication (MFA)
- Magic link authentication
- Advanced audit logging

### 4. Centralized Authentication
- Share authentication across multiple applications
- Single user database for all your services
- Consistent auth experience

### 5. Better User Management
- FusionAuth admin UI for user management
- Advanced user search and filtering
- Bulk operations on users
- User import/export

## Rollback (If Needed)

If you need to rollback to JWT auth:

```bash
# 1. Restore old files
cd apps/api/src
mv routes/auth.ts.backup routes/auth.ts

# 2. Restore old index.ts from git
git checkout HEAD -- src/index.ts

# 3. Restore dependencies
# Edit package.json to add back:
# "@elysiajs/jwt": "^1.1.5"
# "@elysiajs/cookie": "^0.8.0"
# "bcryptjs": "^2.4.3"

# 4. Install
bun install

# 5. Restore config
git checkout HEAD -- src/config.ts
```

## Troubleshooting

### "Cannot connect to Heimdall"
**Solution:** Make sure Heimdall server is running:
```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make dev && make build && make run
curl http://localhost:8080/health
```

### "User not found in local database"
**Solution:** The auto-provisioning should create users automatically. Check:
1. Heimdall server is accessible
2. User was successfully authenticated by Heimdall
3. Check API logs for errors during user creation

### "Permissions not working"
**Solution:** Permissions are still managed locally. Ensure:
1. Database has been migrated with latest schema
2. Seed data has been run (creates default roles)
3. User has been assigned to a tenant with a role

### Old JWT tokens don't work
**Expected:** Old tokens are no longer valid. Users must:
1. Login again via Heimdall
2. Get new tokens
3. Update any saved tokens in client

## Documentation

- **Quick Start**: See `QUICK_START_HEIMDALL.md`
- **Integration Guide**: See `HEIMDALL_INTEGRATION_GUIDE.md`
- **Test Script**: Run `bun run test:heimdall`

## Support

For issues:
1. Check Heimdall is running: `curl http://localhost:8080/health`
2. Check API logs for errors
3. Review documentation files
4. Test endpoints in Swagger UI: http://localhost:3000/api/docs

## Summary

✅ **Migration Complete!**

The platform now uses Heimdall authentication exclusively:
- Cleaner codebase
- Better security
- More features
- Centralized authentication

Start the app with `bun run dev` (Heimdall is now the default).
