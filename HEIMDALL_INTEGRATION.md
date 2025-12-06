# Heimdall Authentication Integration

## Overview

This document describes the integration of Heimdall authentication service with the Accounts Management Platform. Heimdall provides a unified, enterprise-grade authentication layer with features like OAuth, MFA, and comprehensive audit logging.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   Accounts Management Platform                  │
│                                                                 │
│  ┌──────────────┐     ┌─────────────────┐                     │
│  │ Web/Mobile   │────▶│  API Gateway    │                     │
│  │   Clients    │     │  (Elysia/Bun)   │                     │
│  └──────────────┘     └────────┬────────┘                     │
│                                │                               │
│                    ┌───────────▼───────────┐                   │
│                    │  Heimdall Middleware  │                   │
│                    │  Token Verification   │                   │
│                    └───────────┬───────────┘                   │
│                                │                               │
│                    ┌───────────▼───────────┐                   │
│                    │  Local User Sync      │                   │
│                    │  (PostgreSQL)         │                   │
│                    └───────────────────────┘                   │
└────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                      Heimdall Service                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ JWT Token    │  │  FusionAuth  │  │   PostgreSQL │         │
│  │ Verification │  │   (Core)     │  │   (Users)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

## Features Provided by Heimdall

### Authentication Methods
- ✅ Email/Password authentication
- ✅ OAuth 2.0 (Google, GitHub, etc.)
- ✅ Passwordless (Magic Links)
- ✅ Multi-Factor Authentication (TOTP, SMS)
- ✅ JWT token management with auto-refresh

### User Management
- ✅ User registration and profile management
- ✅ Password reset and email verification
- ✅ Account status management
- ✅ Custom user metadata

### Security Features
- ✅ Industry-standard JWT signing
- ✅ Automatic token refresh
- ✅ Rate limiting and DDoS protection
- ✅ Audit logging for compliance
- ✅ Multi-tenant support

## Integration Components

### 1. Heimdall SDK Package

**Location**: `packages/heimdall-sdk/`

The Heimdall Node.js SDK provides:
- `HeimdallClient` - Main client for API interactions
- `AuthModule` - Authentication operations
- `UserModule` - User management operations
- Automatic token refresh
- Storage abstraction for tokens

**Key Files**:
- `src/client.ts` - Main client implementation
- `src/auth.ts` - Authentication module
- `src/user.ts` - User management module
- `src/types.ts` - TypeScript types and interfaces

### 2. Heimdall Client Wrapper

**Location**: `apps/api/src/lib/heimdall.ts`

Initializes and configures the Heimdall client for the Accounts platform:

```typescript
import { heimdallClient } from '@/lib/heimdall'

// Use the client
const user = await heimdallClient.auth.login({
  email: 'user@example.com',
  password: 'password'
})
```

### 3. Heimdall Authentication Middleware

**Location**: `apps/api/src/middleware/heimdall-auth.ts`

Middleware that:
1. Extracts JWT token from Authorization header
2. Verifies token with Heimdall service
3. Syncs user data to local PostgreSQL database
4. Auto-provisions users and tenants
5. Loads user permissions and roles
6. Populates request context

### 4. Heimdall Authentication Routes

**Location**: `apps/api/src/routes/heimdall-auth.ts`

Authentication endpoints that proxy to Heimdall:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### 5. Heimdall-Aware Application Entry Point

**Location**: `apps/api/src/index-heimdall.ts`

Modified application entry point that uses Heimdall authentication instead of legacy JWT auth.

## Setup Instructions

### Prerequisites

1. **Heimdall Service Running**
   ```bash
   cd ~/Documents/sweatAndBlood/sabbatical/heimdall

   # Start dependencies (PostgreSQL, Redis, FusionAuth)
   docker-compose -f docker-compose.dev.yml up -d

   # Run migrations
   go run cmd/migrate/main.go up

   # Start Heimdall
   go run cmd/server/main.go
   ```

   Heimdall will be available at `http://localhost:8080`

2. **PostgreSQL Database** for Accounts platform
   ```bash
   # Already configured in DATABASE_URL
   ```

### Configuration

#### 1. Environment Variables

Add to `apps/api/.env`:

```env
# Heimdall Configuration
USE_HEIMDALL=true
HEIMDALL_URL=http://localhost:8080
HEIMDALL_TENANT_ID=your-tenant-id
```

**Environment Variables Explained**:
- `USE_HEIMDALL`: Enable Heimdall authentication (set to `true`)
- `HEIMDALL_URL`: URL where Heimdall service is running
- `HEIMDALL_TENANT_ID`: (Optional) Default tenant ID for Heimdall

#### 2. Start with Heimdall Authentication

**Option A: Modify `package.json`** (Recommended for development)

In `apps/api/package.json`, change the dev script:

```json
{
  "scripts": {
    "dev": "bun run --watch src/index-heimdall.ts",
    "dev:legacy": "bun run --watch src/index.ts"
  }
}
```

**Option B: Direct Execution**

```bash
cd apps/api
bun run src/index-heimdall.ts
```

### Usage

#### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@company.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe",
    "tenantName": "My Company Ltd",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "owner@company.com",
      "fullName": "John Doe"
    },
    "tenant": {
      "id": "uuid",
      "name": "My Company Ltd",
      "gstin": "29ABCDE1234F1Z5"
    },
    "accessToken": "eyJhbGci...",
    "tokenType": "Bearer"
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@company.com",
    "password": "SecurePassword123!"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "tokenType": "Bearer",
    "user": { ... },
    "tenant": { ... },
    "permissions": [ ... ]
  }
}
```

#### Access Protected Endpoints

```bash
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer eyJhbGci..."
```

## Data Flow

### Registration Flow

1. Client sends registration request to `/api/auth/register`
2. Accounts API forwards request to Heimdall
3. Heimdall creates user in FusionAuth
4. Heimdall returns user data and JWT tokens
5. Accounts API creates:
   - Tenant in local database
   - User in local database
   - TenantUser relationship with owner role
6. Returns access token to client

### Login Flow

1. Client sends login request to `/api/auth/login`
2. Accounts API forwards credentials to Heimdall
3. Heimdall validates with FusionAuth
4. Heimdall returns JWT access token
5. Accounts API retrieves local user data
6. Returns user profile + token to client

### Protected Request Flow

1. Client sends request with `Authorization: Bearer <token>`
2. Heimdall middleware extracts token
3. Middleware verifies token with Heimdall service
4. Heimdall validates JWT signature and expiry
5. Middleware syncs user data to local DB (if needed)
6. Middleware loads user permissions and roles
7. Request proceeds to route handler with user context

## User Data Synchronization

### Auto-Provisioning

When a user authenticated by Heimdall accesses the Accounts platform for the first time, the middleware automatically:

1. **Checks** if user exists in local database
2. **Creates** user record if not exists
3. **Creates** tenant if not exists
4. **Assigns** default "owner" role
5. **Creates** tenant-user relationship

This ensures seamless onboarding without manual provisioning.

### Data Consistency

- **Primary Source**: Heimdall (FusionAuth) is the source of truth for authentication
- **Local Database**: Stores business-specific data (invoices, inventory, etc.)
- **User Profile**: Email and basic info synchronized from Heimdall
- **Passwords**: Managed entirely by Heimdall (never stored locally)

## Migration from Legacy Auth

### Backward Compatibility

The legacy authentication system (`src/routes/auth.ts` and `src/middleware/auth.ts`) remains intact:

- **Legacy Entry Point**: `src/index.ts` - Uses JWT auth with bcrypt
- **Heimdall Entry Point**: `src/index-heimdall.ts` - Uses Heimdall auth

### Migration Strategy

**Option 1: Gradual Migration**
1. Run Heimdall alongside legacy auth
2. Create new users in Heimdall
3. Existing users continue using legacy auth
4. Migrate users one-by-one or in batches

**Option 2: Clean Cut**
1. Export existing users
2. Import into Heimdall (FusionAuth)
3. Switch to Heimdall authentication
4. Deprecate legacy auth

**Recommended**: Option 2 for new projects, Option 1 for existing deployments

## Security Considerations

### Token Management

- **Access Token Expiry**: 15 minutes (configured in Heimdall)
- **Refresh Token Expiry**: 7 days (configured in Heimdall)
- **Auto-Refresh**: SDK automatically refreshes tokens before expiry
- **Token Storage**: In-memory (SDK) or localStorage (browser SDK)

### HTTPS Requirements

**Production**: MUST use HTTPS for all Heimdall communication
- Set `HEIMDALL_URL=https://auth.yourdomain.com`
- Configure SSL/TLS certificates
- Enable secure cookies

### Rate Limiting

Heimdall includes built-in rate limiting:
- **Authenticated Requests**: 1000/hour per user
- **Unauthenticated Requests**: 100/hour per IP

### Audit Logging

All authentication events are logged in Heimdall:
- User registrations
- Login attempts (success/failure)
- Password changes
- Token refreshes
- OAuth connections

## Troubleshooting

### Heimdall Service Not Running

**Error**: `ECONNREFUSED` or `Service Unavailable`

**Solution**:
```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
docker-compose -f docker-compose.dev.yml up -d
go run cmd/server/main.go
```

### Invalid Token

**Error**: `401 Unauthorized - Invalid or expired token`

**Causes**:
- Token expired (>15 minutes old)
- Heimdall service restarted (keys regenerated)
- Token from different environment

**Solution**:
- Login again to get fresh token
- Check `HEIMDALL_URL` configuration
- Verify Heimdall is running

### User Not Found in Local DB

**Error**: `404 User not found in local database`

**Cause**: Auto-provisioning failed

**Solution**:
- Check database connectivity
- Verify `DATABASE_URL` is correct
- Check database roles and permissions exist
- Run `bun run db:seed` to create default roles

### CORS Issues

**Error**: `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution**:
Update `CORS_ORIGINS` in `.env`:
```env
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

## API Endpoints

### Authentication

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/login` | POST | No | Login user |
| `/api/auth/logout` | POST | Yes | Logout user |
| `/api/auth/refresh` | POST | No* | Refresh access token |
| `/api/auth/profile` | GET | Yes | Get user profile |

*Requires valid refresh token

### Protected Resources

All other endpoints (`/api/invoices`, `/api/parties`, etc.) require:
- `Authorization: Bearer <access_token>` header
- Valid, non-expired access token from Heimdall

## Performance Considerations

### Token Verification

- **Average Latency**: ~50ms per request (includes network call to Heimdall)
- **Caching**: Consider implementing Redis cache for verified tokens
- **Rate Limiting**: Heimdall handles this automatically

### Auto-Provisioning

- **First Request**: ~200ms (creates user + tenant + relationships)
- **Subsequent Requests**: ~50ms (user already exists)

### Optimization Tips

1. **Token Caching**: Cache verified tokens in Redis for 5-10 minutes
2. **Connection Pooling**: Use HTTP keep-alive to Heimdall service
3. **Local Validation**: Verify JWT signature locally (coming in future update)

## Future Enhancements

- [ ] **Local JWT Verification**: Verify tokens without calling Heimdall (using public key)
- [ ] **Token Caching**: Redis-based token cache to reduce Heimdall calls
- [ ] **OAuth Integration**: Social login buttons in frontend
- [ ] **MFA Support**: Two-factor authentication UI
- [ ] **Passwordless Auth**: Magic link implementation
- [ ] **Session Management**: View and revoke active sessions
- [ ] **Audit Dashboard**: View authentication logs

## Support

### Documentation

- **Heimdall Docs**: `~/Documents/sweatAndBlood/sabbatical/heimdall/docs/`
- **Heimdall API Reference**: `~/Documents/sweatAndBlood/sabbatical/heimdall/docs/API.md`
- **Heimdall SDK**: `~/Documents/sweatAndBlood/sabbatical/heimdall/sdk/nodejs/README.md`

### Debugging

Enable debug logging:
```env
DEBUG=heimdall:*
LOG_LEVEL=debug
```

View Heimdall logs:
```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
# Logs from running process
```

### Testing

Test authentication integration:
```bash
cd apps/api
bun run test:auth
```

## Conclusion

Heimdall integration provides enterprise-grade authentication with minimal code changes. The system maintains backward compatibility while offering modern features like OAuth, MFA, and comprehensive audit logging.

**Key Benefits**:
- ✅ Centralized authentication across all applications
- ✅ Enterprise features (OAuth, MFA, audit logs)
- ✅ Reduced authentication code complexity
- ✅ Better security with FusionAuth as the core
- ✅ Easy to add new auth methods (social login, etc.)

**Getting Started**:
1. Start Heimdall service
2. Set `USE_HEIMDALL=true` in `.env`
3. Run with `bun run src/index-heimdall.ts`
4. Register a user and test!
