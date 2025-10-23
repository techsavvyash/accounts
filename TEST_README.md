# Testing Guide for Accounts Management Platform

This document provides comprehensive information about the test suite for the Accounts Management Platform.

## Test Structure

The project includes both **unit tests** and **end-to-end (E2E) tests** to ensure system stability and reliability.

### Test Organization

```
accounts/
├── apps/
│   └── api/
│       └── tests/
│           ├── setup.ts                  # Test configuration and helpers
│           ├── run-tests.ts              # Test runner
│           └── e2e/
│               ├── auth.test.ts          # Authentication tests
│               ├── invoice.test.ts       # Invoice management tests
│               ├── gst.test.ts           # GST compliance tests
│               ├── inventory.test.ts     # Inventory management tests
│               ├── webhooks.test.ts      # Webhook tests
│               ├── analytics.test.ts     # Analytics tests
│               ├── ledger.test.ts        # NEW: Ledger/accounting tests
│               └── parties.test.ts       # NEW: Parties management tests
└── packages/
    ├── gst/
    │   └── src/
    │       └── calculator.test.ts        # NEW: Unit tests for GST calculator
    └── webhooks/
        └── src/
            └── publisher.test.ts         # NEW: Unit tests for webhook publisher
```

## Running Tests

### Run All Tests

```bash
# From project root
bun test

# From apps/api directory
cd apps/api
bun test
```

### Run Specific Test Files

```bash
# Run GST calculator unit tests
bun test packages/gst/src/calculator.test.ts

# Run webhook publisher unit tests
bun test packages/webhooks/src/publisher.test.ts

# Run invoice E2E tests
bun test apps/api/tests/e2e/invoice.test.ts

# Run ledger E2E tests
bun test apps/api/tests/e2e/ledger.test.ts

# Run parties E2E tests
bun test apps/api/tests/e2e/parties.test.ts
```

### Run Tests by Category

```bash
# Run all E2E tests
bun test apps/api/tests/e2e/

# Run specific E2E test suite
bun run test:auth
bun run test:invoice
bun run test:gst
bun run test:inventory
bun run test:webhooks
bun run test:analytics
```

## Test Coverage

### Unit Tests

#### GST Calculator Module (`packages/gst/src/calculator.test.ts`)
Tests the core GST calculation engine:

- **Tax Calculations**: Verifies accurate GST calculations for inclusive and exclusive amounts
- **Inter-state vs Intra-state**: Tests IGST vs CGST+SGST calculations
- **Cess Calculations**: Validates cess addition to GST
- **Line Item Tax**: Tests tax calculations for invoice line items
- **Invoice Totals**: Verifies complete invoice tax calculations
- **Reverse GST**: Tests extraction of GST from inclusive amounts
- **HSN/SAC Rates**: Validates rate determination based on HSN/SAC codes
- **Composite Rates**: Tests weighted average rate calculations
- **TDS on GST**: Verifies TDS calculations on GST amounts
- **Rate Manager**: Tests custom rate management functionality
- **Error Handling**: Validates proper error handling for invalid inputs

**Total Tests**: 25+ test cases

#### Webhook Publisher Module (`packages/webhooks/src/publisher.test.ts`)
Tests the webhook event publishing system:

- **Event Publishing**: Validates single event publication
- **Batch Publishing**: Tests batch event publication
- **Event Storage**: Verifies event persistence
- **Event Queuing**: Tests FIFO queue operations
- **Event Filtering**: Tests filtering by type and tenant
- **Event Metadata**: Validates metadata attachment
- **Unique IDs**: Verifies unique event ID generation
- **Error Handling**: Tests error scenarios

**Total Tests**: 20+ test cases

### End-to-End Tests

#### Ledger & Accounting (`apps/api/tests/e2e/ledger.test.ts`)
Tests the complete accounting system:

- **Chart of Accounts**: CRUD operations for accounts
- **Account Hierarchy**: Parent-child account relationships
- **Journal Entries**: Creating balanced double-entry transactions
- **Account Ledger**: Running balance calculations
- **Trial Balance**: Verification of balanced books
- **Profit & Loss Statement**: Income statement generation
- **Balance Sheet**: Financial position reporting
- **Validation**: Account type compatibility and duplicate prevention

**Total Tests**: 15+ test cases

#### Parties Management (`apps/api/tests/e2e/parties.test.ts`)
Tests customer and supplier management:

- **Customer CRUD**: Create, read, update, delete customers
- **Supplier CRUD**: Create, read, update, delete suppliers
- **GSTIN Validation**: Format and validity checks
- **Search & Filtering**: Name search, type filtering, GSTIN filtering
- **Pagination**: List pagination support
- **Sorting**: Alphabetical and custom sorting
- **Validation**: Email format, required fields, duplicates
- **Transaction History**: Party transaction retrieval
- **Outstanding Balance**: Balance calculation
- **Categories & Tags**: Party categorization

**Total Tests**: 20+ test cases

#### Invoice Management (`apps/api/tests/e2e/invoice.test.ts`)
Tests invoice operations:

- **Invoice Creation**: Creating invoices with line items
- **Status Management**: Draft, sent, paid, void statuses
- **Payment Recording**: Full and partial payments
- **Stock Integration**: Inventory level updates
- **GST Calculations**: Automatic tax calculations
- **Line Item Updates**: Modifying invoice items
- **Validation**: Business rule enforcement

**Total Tests**: 10+ test cases

#### GST Compliance (`apps/api/tests/e2e/gst.test.ts`)
Tests GST-specific functionality:

- **Tax Rates**: CRUD for tax rate configurations
- **GST Calculations**: Intra-state and inter-state scenarios
- **GSTIN Validation**: Format and checksum validation
- **GSTR-1 Generation**: Outward supplies return
- **GSTR-3B Generation**: Monthly summary return
- **HSN Classification**: HSN/SAC code management

**Total Tests**: 10+ test cases

## Test Helpers and Utilities

### Test Setup (`apps/api/tests/setup.ts`)

Provides common utilities for all tests:

- **Database Cleanup**: Cleans test database between tests
- **Test App Instance**: Elysia app instance for testing
- **Authentication Helper**: Creates authenticated test users
- **Request Helper**: Makes authenticated API requests
- **Test Data Factories**: Pre-configured test data

### Example Usage

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { TestHelpers, cleanupDatabase } from '../setup'

describe('My Test Suite', () => {
  let authData: any

  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })

  it('should perform action', async () => {
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/endpoint',
      authData.token,
      { data: 'value' }
    )

    expect(response.status).toBe(200)
  })
})
```

## Critical Test Scenarios

### 1. GST Calculation Accuracy
- Validates all GST rate slabs (0%, 5%, 12%, 18%, 28%)
- Inter-state (IGST) vs Intra-state (CGST+SGST)
- Inclusive and exclusive tax calculations
- Cess calculations for luxury items

### 2. Double-Entry Bookkeeping
- All journal entries must be balanced (debits = credits)
- Trial balance always balances
- Balance sheet equation: Assets = Liabilities + Equity
- Running balance calculations are accurate

### 3. Financial Document Integrity
- Invoice numbering is sequential and unique
- Payment tracking is accurate
- Stock levels update correctly
- Reversals properly undo transactions

### 4. Data Validation
- GSTIN format validation (15 characters, valid state code)
- Email format validation
- Phone number formatting
- Duplicate prevention (emails, GST numbers)

### 5. Multi-Tenant Isolation
- Users can only access their tenant's data
- Cross-tenant data leakage is prevented
- Authentication and authorization work correctly

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'bun:test'

describe('Module Name', () => {
  describe('function name', () => {
    it('should handle valid input correctly', () => {
      const result = myFunction(validInput)
      expect(result).toBe(expectedOutput)
    })

    it('should throw error for invalid input', () => {
      expect(() => {
        myFunction(invalidInput)
      }).toThrow(ExpectedError)
    })
  })
})
```

### E2E Test Template

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { TestHelpers, cleanupDatabase } from '../setup'

describe('Feature End-to-End Tests', () => {
  let authData: any

  beforeEach(async () => {
    await cleanupDatabase()
    authData = await TestHelpers.createAuthenticatedUser()
  })

  it('should complete workflow successfully', async () => {
    // Arrange: Create test data
    const testData = { /* ... */ }

    // Act: Perform action
    const response = await TestHelpers.makeAuthenticatedRequest(
      'POST',
      '/api/endpoint',
      authData.token,
      testData
    )

    // Assert: Verify results
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject(expectedData)
  })
})
```

## Test Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data using `beforeEach` and `afterEach`
3. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
4. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
5. **Edge Cases**: Test boundary conditions and error scenarios
6. **Data Validation**: Verify both successful operations and validation failures
7. **Async/Await**: Properly handle asynchronous operations
8. **Assertions**: Use specific assertions rather than generic ones

## Continuous Integration

Tests should be run automatically on:
- Pre-commit hooks
- Pull request creation
- Before deployment to staging/production
- Scheduled nightly runs

## Coverage Goals

- **Unit Tests**: >80% code coverage for business logic
- **E2E Tests**: Cover all critical user workflows
- **API Tests**: Test all public API endpoints
- **Edge Cases**: Test error handling and validation

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Run with verbose output
bun test --verbose

# Run specific test file
bun test path/to/test.ts

# Run tests matching pattern
bun test --grep "invoice"
```

### Common Issues

1. **Database State**: Ensure `cleanupDatabase()` is called in `beforeEach`
2. **Authentication**: Verify `authData` is properly created
3. **Async Operations**: Use `await` for all async operations
4. **Test Data**: Ensure test data is valid and complete

## Future Test Additions

- **Performance Tests**: Load testing for high-volume scenarios
- **Security Tests**: Penetration testing, SQL injection prevention
- **Integration Tests**: External service integration (payment gateways, etc.)
- **Contract Tests**: API contract verification
- **Smoke Tests**: Quick validation of critical paths

## Reporting Issues

When reporting test failures, include:
1. Test file name and line number
2. Error message and stack trace
3. Steps to reproduce
4. Expected vs actual behavior
5. Environment details (OS, Bun version, database)

## Summary

The test suite provides comprehensive coverage of:
- ✅ Core business logic (GST calculations, accounting rules)
- ✅ API endpoints (all major features)
- ✅ Data validation and error handling
- ✅ User workflows (invoice creation, payment recording, etc.)
- ✅ System integration (webhooks, events, analytics)

The tests ensure system stability, prevent regressions, and validate that the platform meets business requirements for accounting, GST compliance, and financial management.
