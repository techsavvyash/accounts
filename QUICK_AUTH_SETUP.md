# Quick Authentication Setup Guide

## TL;DR

**You already have authentication implemented.** Just need to:
1. Run database migrations
2. Seed default roles
3. Start the server

**No FusionAuth or external auth service required.**

## Setup Commands

```bash
# 1. Navigate to project root
cd /Users/techsavvyash/sweatAndBlood/JBG/accounts

# 2. Install dependencies (if not already done)
bun install

# 3. Setup database schema
cd packages/database
bun run prisma migrate dev

# 4. Seed default roles and permissions
bun run prisma db seed

# 5. Start API server
cd ../../apps/api
bun run dev

# Server will start at http://localhost:3000
```

## Test Authentication

### Using cURL

#### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe",
    "tenantName": "My Business Ltd",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "SecurePassword123!"
  }'
```

Response will include:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... },
  "tenant": { ... },
  "permissions": [ ... ]
}
```

#### Access protected endpoint
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Test Suite

```bash
# Run authentication E2E tests
cd apps/api
bun run test:auth

# All tests should pass
```

## Environment Configuration

Check `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/accounts_db"
JWT_SECRET="dev-jwt-secret-change-in-production"
JWT_EXPIRY="7d"
REFRESH_TOKEN_EXPIRY="30d"
```

**For production**: Change `JWT_SECRET` to a strong random value:
```bash
openssl rand -base64 32
```

## What's Included

✅ User registration with email/password
✅ Secure password hashing (bcrypt)
✅ JWT access tokens (7 day expiry)
✅ Refresh tokens (30 day expiry)
✅ Multi-tenant support
✅ Role-based access control (owner/admin/sales_person)
✅ Protected routes with middleware
✅ Permission-based authorization
✅ Secure cookies (HttpOnly, Secure in production)
✅ Logout with token revocation

## Architecture

```
Registration
    ↓
User + Tenant Created
    ↓
Owner Role Assigned
    ↓
User-Tenant Relationship Established

Login
    ↓
Password Verified (bcrypt)
    ↓
JWT Access Token Generated
    ↓
Refresh Token Stored in DB
    ↓
Tokens Returned + Set in Cookies

Protected Routes
    ↓
Extract Token from Cookie/Header
    ↓
Verify JWT Signature
    ↓
Load User + Tenant + Permissions
    ↓
Populate Request Context
    ↓
Route Handler Executes
```

## Common Issues

### "Owner role not found"
**Solution**: Run database seed
```bash
cd packages/database
bun run prisma db seed
```

### "Connection refused" to database
**Solution**: Start PostgreSQL
```bash
# macOS with Homebrew
brew services start postgresql@14

# Or using Docker
docker run -d \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=accounts_db \
  postgres:14
```

### "Token verification failed"
**Solution**: Check `JWT_SECRET` matches in `.env`

## API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/refresh` | POST | No* | Refresh token |
| `/api/auth/logout` | POST | Yes | Logout |
| `/api/auth/profile` | GET | Yes | Get profile |

*Requires valid refresh token

## Default Roles

After seeding, these roles are available:

- **owner**: Full access to all resources
- **admin**: User management and configuration
- **sales_person**: Limited to sales operations

## Next Steps

1. ✅ Setup complete → Start building features
2. Add password reset flow (optional)
3. Add email verification (optional)
4. Implement MFA (optional)
5. Add social login (optional)

## Need Help?

- Full analysis: See `AUTHENTICATION_ANALYSIS.md`
- Code reference:
  - Auth routes: `apps/api/src/routes/auth.ts`
  - Auth middleware: `apps/api/src/middleware/auth.ts`
  - Database schema: `packages/database/prisma/schema.prisma`
- Tests: `apps/api/tests/e2e/auth.test.ts`

## Summary

You have a **complete, production-ready authentication system** using:
- JWT tokens
- bcrypt password hashing
- Role-based access control
- Multi-tenant architecture
- PostgreSQL for storage

**No external services required.** Just run migrations, seed roles, and start the server.
