# Quick Start: Heimdall Authentication

This guide will get you up and running with Heimdall authentication in the Accounts platform in under 5 minutes.

## Prerequisites

- Bun runtime installed
- Docker and Docker Compose (for Heimdall services)
- PostgreSQL running for Accounts database

## Step 1: Start Heimdall Server

```bash
# Navigate to Heimdall directory
cd ~/Documents/sweatAndBlood/sabbatical/heimdall

# Start development environment (PostgreSQL, Redis, FusionAuth)
make dev

# Wait for services to be ready (about 30 seconds)
# Then build and run Heimdall
make build
make run
```

Heimdall will start on `http://localhost:8080`

**Verify it's running:**
```bash
curl http://localhost:8080/health
# Should return: {"status":"healthy","timestamp":"..."}
```

## Step 2: Start Accounts API with Heimdall Auth

```bash
# Navigate to accounts project
cd ~/sweatAndBlood/JBG/accounts

# Make sure dependencies are installed
bun install

# Start API with Heimdall authentication
cd apps/api
bun run dev:heimdall
```

The API will start on `http://localhost:3000`

**Verify it's running:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy","authProvider":"heimdall","timestamp":"..."}
```

## Step 3: Test the Integration

Run the integration test script:

```bash
cd ~/sweatAndBlood/JBG/accounts/apps/api
bun run test-heimdall-integration.ts
```

This will:
1. Check Heimdall server health
2. Check API server health
3. Register a new user
4. Login with the user
5. Fetch user profile (authenticated)
6. Logout

## Step 4: Explore the API

Visit the Swagger documentation:
```
http://localhost:3000/api/docs
```

### Available Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

**Protected Resources:**
- All other endpoints require Bearer token authentication
- Include token in `Authorization: Bearer <token>` header

## Example: Register and Login

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "fullName": "John Doe",
    "tenantName": "My Business",
    "gstin": "29ABCDE1234F1Z5",
    "pan": "ABCDE1234F"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id": "...", "email": "user@example.com", "fullName": "John Doe" },
    "tenant": { "id": "...", "name": "My Business" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "tokenType": "Bearer"
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### 3. Use Access Token

```bash
# Get profile
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <your-access-token>"

# Access protected endpoints
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <your-access-token>"
```

## Architecture Overview

```
┌─────────────┐        ┌─────────────┐        ┌──────────────┐
│   Client    │───────>│ Accounts API│───────>│   Heimdall   │
│             │<───────│  (port 3000)│<───────│  (port 8080) │
└─────────────┘        └─────────────┘        └──────────────┘
                              │                       │
                              │                       │
                              v                       v
                       ┌─────────────┐        ┌──────────────┐
                       │  Accounts   │        │  FusionAuth  │
                       │  Database   │        │  (port 9011) │
                       └─────────────┘        └──────────────┘
```

**Flow:**
1. Client registers/logs in via Accounts API
2. Accounts API forwards auth to Heimdall
3. Heimdall validates with FusionAuth
4. Heimdall returns JWT tokens
5. Accounts API creates local user/tenant records
6. Client uses tokens for subsequent requests

## What's Different from Original Auth?

### Before (JWT Auth):
- Users managed in local database
- Passwords stored in local database
- JWT signed and verified locally
- No external dependencies

### After (Heimdall Auth):
- Users authenticated via Heimdall/FusionAuth
- Passwords managed by FusionAuth
- JWT signed by Heimdall, verified locally
- Requires Heimdall server running
- User records sync'd to local database for tenant/permissions

### Benefits:
- Centralized authentication across all your apps
- Enterprise-grade auth features (SSO, MFA, social login)
- Audit logging and security features
- Easier to add new auth methods
- FusionAuth UI for user management

## Troubleshooting

### Heimdall server not starting

```bash
# Check Docker services
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
docker-compose -f docker-compose.dev.yml ps

# View logs
make logs

# Restart services
make down
make dev
```

### API can't connect to Heimdall

Check the configuration in `apps/api/src/config.ts`:
```typescript
HEIMDALL_URL: 'http://localhost:8080'
```

### Database errors

Make sure PostgreSQL is running and the database is migrated:
```bash
cd ~/sweatAndBlood/JBG/accounts
bun run db:migrate
```

### Token verification fails

- Ensure Heimdall server is running
- Check that the token hasn't expired (default: 3600 seconds)
- Verify the token in the Authorization header is formatted correctly

## Switching Back to Original Auth

To use the original JWT-based auth:

```bash
# Use the original index.ts instead
cd apps/api
bun run dev
# This will use src/index.ts instead of src/index-heimdall.ts
```

## Next Steps

1. **Frontend Integration**: Update your web app to use Heimdall auth
2. **User Migration**: Migrate existing users to Heimdall if needed
3. **Configure FusionAuth**: Access FusionAuth UI at http://localhost:9011 for advanced config
4. **Production Setup**: Deploy Heimdall and FusionAuth to production
5. **Enable Additional Features**: SSO, MFA, social login, etc.

## Resources

- **Heimdall Documentation**: `~/Documents/sweatAndBlood/sabbatical/heimdall/README.md`
- **Sample App**: `~/Documents/sweatAndBlood/sabbatical/heimdall/examples/sample-app`
- **API Docs**: http://localhost:3000/api/docs
- **FusionAuth Admin**: http://localhost:9011
- **Integration Guide**: See `HEIMDALL_INTEGRATION_GUIDE.md`

## Need Help?

- Check Heimdall logs: `cd ~/Documents/sweatAndBlood/sabbatical/heimdall && make logs`
- Check API logs: Server output in terminal
- Review integration guide: `HEIMDALL_INTEGRATION_GUIDE.md`
- Test endpoints in Swagger UI: http://localhost:3000/api/docs
