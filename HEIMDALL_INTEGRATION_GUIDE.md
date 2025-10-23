# Heimdall Authentication Integration Guide

## Overview
This guide explains the Heimdall authentication integration in the Accounts Management Platform. Heimdall is an authentication service that uses FusionAuth under the hood.

## Architecture

### Components

1. **Heimdall Server** (localhost:8080)
   - Standalone authentication service
   - Uses FusionAuth for user management
   - Provides JWT-based authentication

2. **Heimdall SDK** (`packages/heimdall-sdk/`)
   - TypeScript SDK for Node.js/Bun
   - Handles authentication, token management, and user operations
   - Auto-refresh tokens support
   - Located at: `@accounts/heimdall`

3. **Accounts API** (`apps/api/`)
   - Uses Heimdall SDK for authentication
   - Two index files:
     - `src/index.ts` - Original JWT-based auth
     - `src/index-heimdall.ts` - Heimdall-based auth

## Integration Details

### 1. SDK Structure

The Heimdall SDK is located at `packages/heimdall-sdk/` and provides:

```typescript
// Main client
import { HeimdallClient } from '@accounts/heimdall'

const client = new HeimdallClient({
  apiUrl: 'http://localhost:8080',
  tenantId: 'optional-tenant-id',
  autoRefresh: true,
  refreshBuffer: 60
})

// Authentication
await client.auth.register({ email, password, firstName, lastName })
await client.auth.login({ email, password })
await client.auth.logout()
await client.auth.refreshTokens()

// User management
await client.user.getProfile()
await client.user.updateProfile({ firstName, lastName })
await client.user.deleteAccount()
```

### 2. API Routes

Heimdall authentication routes are in `apps/api/src/routes/heimdall-auth.ts`:

- `POST /api/auth/register` - Register new user
  - Registers user with Heimdall
  - Creates local tenant and user record
  - Returns access and refresh tokens

- `POST /api/auth/login` - User login
  - Authenticates with Heimdall
  - Fetches local user and tenant data
  - Returns tokens and permissions

- `POST /api/auth/logout` - User logout
  - Revokes Heimdall session
  - Clears tokens

- `POST /api/auth/refresh` - Refresh access token
  - Uses refresh token to get new access token

- `GET /api/auth/profile` - Get user profile
  - Requires authentication
  - Returns user, tenant, and permissions

### 3. Authentication Middleware

The middleware in `apps/api/src/middleware/heimdall-auth.ts`:

- Extracts Bearer token from Authorization header
- Verifies token with Heimdall server
- Auto-provisions local user if not exists
- Populates request context with user data:
  - `store.userId`
  - `store.tenantId`
  - `store.roleId`
  - `store.roleName`
  - `store.permissions`

### 4. Simple HTTP Client

For cases where the full SDK isn't needed, `apps/api/src/lib/heimdall-simple.ts` provides direct HTTP calls:

```typescript
import { heimdallAuth } from '../lib/heimdall-simple'

await heimdallAuth.register({ email, password, firstName, lastName })
await heimdallAuth.login({ email, password })
await heimdallAuth.verify(token)
```

## Running the Application

### Prerequisites

1. **Start Heimdall Server**
   ```bash
   cd ~/Documents/sweatAndBlood/sabbatical/heimdall
   # Follow Heimdall's startup instructions
   # Default: http://localhost:8080
   ```

2. **Configure Environment**
   ```bash
   # apps/api/.env
   USE_HEIMDALL=true
   HEIMDALL_URL=http://localhost:8080
   HEIMDALL_TENANT_ID=your-tenant-id  # Optional
   ```

3. **Install Dependencies**
   ```bash
   bun install
   ```

### Start with Heimdall Auth

```bash
# Run API with Heimdall authentication
cd apps/api
bun run dev:heimdall
```

The API will start on http://localhost:3000 with Heimdall authentication enabled.

## Testing the Integration

A test script is available at `apps/api/test-heimdall-integration.ts`:

```bash
# Make sure both Heimdall server and API are running
bun run apps/api/test-heimdall-integration.ts
```

This script tests:
1. Heimdall server health check
2. API server health check
3. User registration
4. User login
5. Authenticated profile fetch
6. User logout

## Authentication Flow

### Registration Flow

```
Client                API                 Heimdall            Database
  │                    │                      │                  │
  ├─── POST /auth/register ──>               │                  │
  │                    ├──── Register ───────>                  │
  │                    │<──── User + Tokens ──┤                 │
  │                    ├─── Create Tenant ────────────────────> │
  │                    ├─── Create Local User ─────────────────>│
  │                    ├─── Associate User + Tenant ───────────>│
  │<─── User + Tokens ─┤                      │                 │
```

### Login Flow

```
Client                API                 Heimdall            Database
  │                    │                      │                  │
  ├─── POST /auth/login ──>                  │                  │
  │                    ├──── Login ──────────>                  │
  │                    │<──── User + Tokens ──┤                 │
  │                    ├─── Get Local User ──────────────────> │
  │<─── User + Tokens ─┤                      │                 │
```

### Authenticated Request Flow

```
Client                API                 Heimdall            Database
  │                    │                      │                  │
  ├─── GET /profile (Bearer token) ──>       │                  │
  │                    ├──── Verify Token ────>                 │
  │                    │<──── User Info ──────┤                 │
  │                    ├─── Get/Create Local User ─────────────>│
  │<─── Profile Data ──┤                      │                 │
```

## Key Features

### 1. Dual Tenant System
- **Heimdall Tenant**: Managed by FusionAuth for authentication
- **Local Tenant**: Business-specific tenant for accounts/invoices
- Users can belong to Heimdall tenant but have their own local business tenant

### 2. Auto-Provisioning
- Users authenticated via Heimdall are automatically created in local database
- Tenants are created if they don't exist
- Default roles are assigned

### 3. Token Management
- Access tokens for API requests
- Refresh tokens for long-lived sessions
- Automatic token refresh with configurable buffer

### 4. Permission System
- Local RBAC system (roles, permissions)
- Permissions are fetched from local database
- Integrated with existing middleware

## Migration Path

To migrate from JWT auth to Heimdall auth:

1. **Update entry point**:
   ```bash
   # Change dev script in package.json
   "dev": "bun run --watch src/index-heimdall.ts"
   ```

2. **Or use environment variable**:
   ```typescript
   // In index.ts, conditionally load routes
   if (config.USE_HEIMDALL) {
     app.use(heimdallAuthRoutes)
     app.guard({ beforeHandle: heimdallAuthMiddleware }, ...)
   } else {
     app.use(authRoutes)
     app.guard({ beforeHandle: authMiddleware }, ...)
   }
   ```

## Troubleshooting

### Heimdall server not responding
```bash
# Check if Heimdall is running
curl http://localhost:8080/health

# Start Heimdall server
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
# Follow startup instructions
```

### Token verification fails
- Check `HEIMDALL_URL` in config
- Ensure Heimdall server is accessible
- Verify token hasn't expired

### User auto-provisioning fails
- Check database connectivity
- Ensure `owner` role exists (run seed script)
- Check database logs for constraint violations

## API Documentation

With Swagger enabled, visit:
- http://localhost:3000/api/docs

This provides interactive API documentation for all Heimdall auth endpoints.

## Sample Client Code

### Browser/Frontend

```javascript
// Use the browser SDK from sample app
const heimdall = new HeimdallClient({
  apiUrl: 'http://localhost:8080'
})

// Register
const user = await heimdall.auth.register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
})

// Login
await heimdall.auth.login({
  email: 'user@example.com',
  password: 'password123'
})

// Make authenticated request
const profile = await heimdall.user.getProfile()
```

### Node.js/Server

```typescript
import { HeimdallClient } from '@accounts/heimdall'

const client = new HeimdallClient({
  apiUrl: 'http://localhost:8080'
})

// Use the same API as browser
await client.auth.login({ email, password })
const profile = await client.user.getProfile()
```

## Files Modified/Created

### New Files
- `packages/heimdall-sdk/` - Complete SDK package
- `apps/api/src/index-heimdall.ts` - Heimdall-enabled API entry
- `apps/api/src/routes/heimdall-auth.ts` - Heimdall auth routes
- `apps/api/src/middleware/heimdall-auth.ts` - Auth middleware
- `apps/api/src/lib/heimdall-simple.ts` - Simple HTTP client
- `apps/api/test-heimdall-integration.ts` - Integration test script

### Modified Files
- `apps/api/package.json` - Added dependencies and scripts
- `apps/api/src/config.ts` - Added Heimdall config

## Next Steps

1. **Start Heimdall Server**
2. **Run API with Heimdall**:
   ```bash
   bun run dev:heimdall
   ```
3. **Test the integration**:
   ```bash
   bun run test-heimdall-integration.ts
   ```
4. **Update frontend** to use Heimdall authentication
5. **Migrate existing users** if needed

## Support

- Heimdall Repository: `~/Documents/sweatAndBlood/sabbatical/heimdall`
- Sample App: `~/Documents/sweatAndBlood/sabbatical/heimdall/examples/sample-app`
- API Documentation: http://localhost:3000/api/docs
