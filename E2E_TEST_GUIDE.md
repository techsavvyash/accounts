# E2E Testing Guide - Heimdall Authentication

## Quick Start

### Prerequisites

**1. Start Heimdall Server** (Required)

```bash
# Terminal 1: Start Heimdall
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make dev && make build && make run

# Verify it's running
curl http://localhost:8080/health
# Should return: {"status":"healthy",...}
```

**2. Ensure Database is Migrated**

```bash
cd ~/sweatAndBlood/JBG/accounts
bun run db:migrate
```

### Running the Tests

**Option 1: Automated Script** (Recommended)

```bash
./scripts/run-e2e-tests.sh
```

This script will:
- ✅ Check if Heimdall is running
- ✅ Check if API is running
- ✅ Auto-start API if needed
- ✅ Run all E2E tests
- ✅ Show results

**Option 2: Manual Commands**

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI (interactive mode)
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Debug mode
bun run test:e2e:debug

# View report after tests
bun run test:e2e:report
```

## What Gets Tested

The E2E test suite (`tests/e2e/heimdall-auth.e2e.ts`) includes:

### ✅ Core Authentication Flow
1. **Health Checks**
   - Verify Heimdall server is healthy
   - Verify API server is using Heimdall auth

2. **User Registration**
   - Successful registration
   - Duplicate email handling
   - Field validation
   - Token generation

3. **User Login**
   - Successful login
   - Invalid credentials handling
   - Token refresh

4. **Authenticated Requests**
   - Access profile with valid token
   - Reject requests without token
   - Reject requests with invalid token

5. **Token Management**
   - JWT format validation
   - Token refresh flow
   - Token expiration

6. **Logout**
   - Successful logout
   - Session cleanup

### ✅ Advanced Scenarios
- Full authentication flow (register → login → access → logout → login)
- Concurrent authentication requests
- Tenant and user association validation
- Permission system verification

## Test Output

### Successful Run
```
Running 15 tests using 1 worker

  ✓  should verify API health with Heimdall auth provider (123ms)
  ✓  should register a new user successfully (456ms)
  ✓  should fail registration with duplicate email (234ms)
  ✓  should login successfully with valid credentials (345ms)
  ✓  should fail login with invalid credentials (123ms)
  ✓  should access authenticated endpoints with valid token (234ms)
  ✓  should fail to access authenticated endpoints without token (123ms)
  ✓  should fail to access authenticated endpoints with invalid token (123ms)
  ✓  should refresh access token successfully (345ms)
  ✓  should fail to refresh with invalid refresh token (123ms)
  ✓  should logout successfully (234ms)
  ✓  should complete full authentication flow (789ms)
  ✓  should validate JWT token format and structure (234ms)
  ✓  should handle concurrent authentication requests (567ms)
  ✓  should validate required fields in registration (345ms)

  15 passed (4.2s)
```

### Viewing Detailed Results

```bash
# View HTML report
bun run test:e2e:report

# This opens a browser with:
# - Test results
# - Screenshots (on failure)
# - Traces (on failure)
# - Request/response details
```

## Troubleshooting

### Error: "Heimdall server not responding"

**Cause:** Heimdall server is not running

**Solution:**
```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make dev && make build && make run
```

### Error: "ECONNREFUSED" on localhost:3000

**Cause:** API server failed to start

**Solution:**
1. Check if port 3000 is already in use:
   ```bash
   lsof -i :3000
   ```

2. Kill any process using port 3000:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

3. Start API manually:
   ```bash
   cd apps/api
   bun run dev
   ```

4. Run tests with `SKIP_SERVER_START=true`:
   ```bash
   SKIP_SERVER_START=true bun run test:e2e
   ```

### Tests timeout

**Cause:** Slow network or server response

**Solution:** Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60 * 1000, // 60 seconds instead of 30
```

### Database errors

**Cause:** Database not migrated or schema mismatch

**Solution:**
```bash
bun run db:migrate
```

### "Owner role not found" error

**Cause:** Database seed data not loaded

**Solution:**
```bash
# Run the seed script to create default roles
cd packages/database
bun run seed
```

## Test Structure

```
tests/e2e/
├── heimdall-auth.e2e.ts    # Main test suite
├── helpers/
│   └── auth.ts             # Helper utilities
└── README.md               # Documentation
```

## Writing Additional Tests

### Example: Test Protected Endpoint

```typescript
import { test, expect } from '@playwright/test'
import { generateTestUser, registerUser } from './helpers/auth'

test('should access products with authentication', async ({ request }) => {
  // Setup: Register and get token
  const user = generateTestUser()
  const authData = await registerUser(request, user)
  const token = authData.data.accessToken

  // Test: Access protected endpoint
  const response = await request.get('/api/products', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data).toHaveProperty('products')
})
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start Heimdall
        run: |
          cd $HOME/heimdall
          make dev &
          make build
          make run &
          sleep 10

      - name: Migrate database
        run: bun run db:migrate

      - name: Run E2E tests
        run: bun run test:e2e

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Benchmarks

Expected test durations (approximate):

- Health checks: < 200ms
- Registration: 300-500ms
- Login: 200-400ms
- Authenticated requests: 200-300ms
- Token refresh: 300-500ms
- Full flow: 800-1200ms

Total suite: 3-5 seconds (15 tests)

## Best Practices

1. **Always start Heimdall first** - Tests will fail without it
2. **Use test helpers** - Don't duplicate auth logic
3. **Generate unique test data** - Prevent conflicts
4. **Check test reports** - View details on failures
5. **Run locally before CI** - Catch issues early
6. **Keep tests independent** - No reliance on test order

## Resources

- **Test Suite**: `tests/e2e/heimdall-auth.e2e.ts`
- **Helper Functions**: `tests/e2e/helpers/auth.ts`
- **Playwright Docs**: https://playwright.dev/docs/intro
- **Config**: `playwright.config.ts`

## Support

For issues:
1. Check Heimdall is running: `curl http://localhost:8080/health`
2. Check API is running: `curl http://localhost:3000/health`
3. View test report: `bun run test:e2e:report`
4. Run in debug mode: `bun run test:e2e:debug`

---

**Ready to test?**

```bash
# Start Heimdall (Terminal 1)
cd ~/Documents/sweatAndBlood/sabbatical/heimdall && make dev && make build && make run

# Run tests (Terminal 2)
cd ~/sweatAndBlood/JBG/accounts && ./scripts/run-e2e-tests.sh
```

🎉 **Happy Testing!**
