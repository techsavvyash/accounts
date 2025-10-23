# E2E Tests with Playwright

This directory contains end-to-end tests for the Accounts Management Platform using Playwright.

## Prerequisites

Before running the tests, ensure:

1. **Heimdall server is running** on `http://localhost:8080`
   ```bash
   cd ~/Documents/sweatAndBlood/sabbatical/heimdall
   make dev && make build && make run
   ```

2. **Database is migrated** with latest schema
   ```bash
   bun run db:migrate
   ```

3. **Playwright browsers are installed**
   ```bash
   npx playwright install
   ```

## Running Tests

### Run all E2E tests
```bash
bun run test:e2e
```

### Run tests with UI (interactive)
```bash
bun run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
bun run test:e2e:headed
```

### Debug tests
```bash
bun run test:e2e:debug
```

### View test report
```bash
bun run test:e2e:report
```

## Test Structure

### Authentication Tests (`heimdall-auth.e2e.ts`)

Tests the complete Heimdall authentication flow:

- ✅ Health check verification
- ✅ User registration
- ✅ User login
- ✅ Authenticated requests
- ✅ Token refresh
- ✅ Logout
- ✅ Error handling
- ✅ Validation
- ✅ Concurrent requests
- ✅ Full authentication flow

### Test Helpers (`helpers/auth.ts`)

Utility functions for authentication tests:

- `generateTestUser()` - Create unique test users
- `registerUser()` - Register a new user
- `loginUser()` - Login a user
- `getUserProfile()` - Get user profile
- `logoutUser()` - Logout a user
- `refreshAccessToken()` - Refresh access token
- `createAuthHeaders()` - Create auth headers
- `isValidJWT()` - Validate JWT format
- `decodeJWT()` - Decode JWT payload

## Configuration

Tests are configured in `playwright.config.ts` at the root level.

### Environment Variables

- `API_URL` - API base URL (default: `http://localhost:3000`)
- `HEIMDALL_URL` - Heimdall server URL (default: `http://localhost:8080`)
- `SKIP_SERVER_START` - Skip starting API server (useful if already running)

### Example
```bash
# Run tests against different API
API_URL=http://localhost:4000 bun run test:e2e

# Skip auto-starting the server
SKIP_SERVER_START=true bun run test:e2e
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { generateTestUser, registerUser } from './helpers/auth'

test.describe('My Feature Tests', () => {
  test('should do something', async ({ request }) => {
    const user = generateTestUser()
    const response = await registerUser(request, user)

    expect(response.success).toBe(true)
  })
})
```

### Using Test Helpers

```typescript
import { test, expect } from '@playwright/test'
import {
  generateTestUser,
  registerUser,
  loginUser,
  getUserProfile
} from './helpers/auth'

test('should access profile after login', async ({ request }) => {
  // Register
  const user = generateTestUser()
  await registerUser(request, user)

  // Login
  const loginData = await loginUser(request, user.email, user.password)

  // Get profile
  const profile = await getUserProfile(request, loginData.data.accessToken)

  expect(profile.data.user.email).toBe(user.email)
})
```

## Test Coverage

Current test coverage for authentication:

- ✅ Registration flow
- ✅ Login flow
- ✅ Logout flow
- ✅ Token refresh
- ✅ Authenticated requests
- ✅ Error handling
- ✅ Input validation
- ✅ Concurrent operations
- ✅ JWT token validation
- ✅ Tenant/user associations

## Troubleshooting

### Tests fail with "Heimdall server not responding"

**Solution:** Start Heimdall server first
```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make dev && make build && make run
```

### Tests fail with "ECONNREFUSED"

**Solution:** Check if API server is running
```bash
curl http://localhost:3000/health
```

### Tests timeout

**Solution:** Increase timeout in `playwright.config.ts`
```typescript
timeout: 60 * 1000, // 60 seconds
```

### Browser not found

**Solution:** Install Playwright browsers
```bash
npx playwright install
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: bun install

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Start Heimdall
  run: |
    cd ~/heimdall
    make dev && make build && make run &
    sleep 10

- name: Run E2E tests
  run: bun run test:e2e
```

## Best Practices

1. **Use test helpers** - Don't duplicate auth logic
2. **Generate unique test data** - Use `generateTestUser()`
3. **Clean up after tests** - Logout or delete test users
4. **Test error cases** - Not just happy paths
5. **Use meaningful assertions** - Check specific properties
6. **Keep tests independent** - Don't rely on test order
7. **Use descriptive test names** - Explain what is being tested

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
