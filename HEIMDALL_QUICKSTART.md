# Heimdall Authentication - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start Heimdall Service

```bash
# Navigate to Heimdall directory
cd ~/Documents/sweatAndBlood/sabbatical/heimdall

# Start dependencies (PostgreSQL, Redis, FusionAuth)
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready (~30 seconds)
# Check FusionAuth at http://localhost:9011

# Run database migrations
go run cmd/migrate/main.go up

# Start Heimdall server
go run cmd/server/main.go
```

Heimdall will start on **http://localhost:8080**

### Step 2: Configure Accounts Platform

```bash
# Navigate to Accounts platform
cd /Users/techsavvyash/sweatAndBlood/JBG/accounts

# Update environment variables
# Edit apps/api/.env and set:
USE_HEIMDALL=true
HEIMDALL_URL=http://localhost:8080
HEIMDALL_TENANT_ID=   # Leave empty for now
```

### Step 3: Start Accounts API with Heimdall

```bash
# Install dependencies (if not done)
bun install

# Run database migrations
cd packages/database
bun run prisma migrate dev

# Seed default roles
bun run prisma db seed

# Start API with Heimdall authentication
cd ../../apps/api
bun run src/index-heimdall.ts
```

API will start on **http://localhost:3000** with Heimdall auth!

### Step 4: Test the Integration

#### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "fullName": "Test User",
    "tenantName": "Test Company",
    "gstin": "29ABCDE1234F1Z5"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "user": { ... },
    "tenant": { ... }
  }
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Access Protected Endpoint

```bash
# Use the access token from login response
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## ✅ Verification Checklist

- [ ] Heimdall service running on http://localhost:8080
- [ ] PostgreSQL and Redis containers running
- [ ] FusionAuth accessible at http://localhost:9011
- [ ] Accounts API running on http://localhost:3000
- [ ] Successfully registered a user
- [ ] Successfully logged in
- [ ] Received JWT access token
- [ ] Accessed protected endpoint with token

## 🔧 Common Issues

### Heimdall not starting

**Error**: `Error: dial tcp 127.0.0.1:5432: connect: connection refused`

**Solution**: Start PostgreSQL
```bash
docker-compose -f docker-compose.dev.yml up -d postgres
```

### API can't reach Heimdall

**Error**: `ECONNREFUSED` or `Service Unavailable`

**Solution**:
1. Check Heimdall is running: `curl http://localhost:8080/health`
2. Verify `HEIMDALL_URL` in `.env`

### User creation fails

**Error**: `Owner role not found`

**Solution**: Run database seed
```bash
cd packages/database
bun run prisma db seed
```

## 📋 Next Steps

1. **Read Full Documentation**: See `HEIMDALL_INTEGRATION.md`
2. **Configure OAuth**: Add Google/GitHub login
3. **Enable MFA**: Set up two-factor authentication
4. **Production Setup**: Deploy with HTTPS and proper secrets

## 🎯 Features You Get with Heimdall

✅ **Email/Password** authentication
✅ **JWT** tokens with auto-refresh
✅ **Passwordless** authentication (magic links)
✅ **OAuth 2.0** (Google, GitHub) - Coming soon
✅ **Multi-Factor Auth** (TOTP) - Coming soon
✅ **Audit Logging** - All auth events logged
✅ **Rate Limiting** - Built-in DDoS protection
✅ **User Management** - Profile, metadata, roles

## 🆘 Need Help?

- **Documentation**: `HEIMDALL_INTEGRATION.md` (comprehensive guide)
- **Authentication Analysis**: `AUTHENTICATION_ANALYSIS.md` (legacy vs Heimdall)
- **Heimdall Docs**: `~/Documents/sweatAndBlood/sabbatical/heimdall/README.md`
- **API Reference**: `~/Documents/sweatAndBlood/sabbatical/heimdall/docs/API.md`

## 🔄 Switch Back to Legacy Auth

Don't like Heimdall? Easy to switch back:

```bash
# In apps/api/.env, set:
USE_HEIMDALL=false

# Start with legacy auth
bun run src/index.ts
```

Your data is safe - both auth systems work with the same database!

---

**Status**: ✅ Integration Complete

You now have enterprise-grade authentication powered by Heimdall!
