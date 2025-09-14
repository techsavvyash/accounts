# Business Accounts Management Platform - System Design

## Table of Contents
1. [System Overview](#system-overview)
2. [Strategic Foundation](#strategic-foundation)
3. [Architecture Blueprint](#architecture-blueprint)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Security & Access Control](#security--access-control)
7. [GST Compliance](#gst-compliance)
8. [Analytics & Reporting](#analytics--reporting)
9. [Technology Stack](#technology-stack)
10. [Implementation Strategy](#implementation-strategy)

## System Overview

The Business Accounts Management Platform is a modern, cloud-native, API-first accounting platform designed specifically for the Indian market. Built to disrupt the traditional desktop-based accounting software landscape, this platform provides comprehensive business operations management including double-entry bookkeeping, inventory management, invoicing, GST compliance, and financial reporting.

### Key Objectives
- **API-First Architecture**: Platform designed as API-centric from inception, treating API as first-class citizen
- **Cloud-Native Multi-Tenant SaaS**: Built for scalability and remote accessibility 
- **Extensibility & Hackability**: Event-driven architecture with webhooks and plugin support
- **GST Compliance Automation**: Seamless integration with GSTN via GSP partners
- **Real-Time Analytics**: Data warehouse backed business intelligence
- **Multi-Client Support**: Web, mobile, WhatsApp bot, and third-party integrations

## Strategic Foundation

### Market Context
The Indian accounting software market has been dominated by desktop-based solutions with limitations including:
- Steep learning curves for new users
- Lack of modern cloud features for remote access
- Performance degradation with large data volumes (50,000+ vouchers)
- Multi-user functionality restricted to local networks
- Complex API integration requiring third-party modules

### Competitive Advantage
Our platform addresses these gaps through:
- **Cloud-Native Architecture**: Full remote accessibility and scalability
- **Modern API Design**: OpenAPI spec-driven development with comprehensive documentation
- **Event-Driven Extensibility**: Webhook-based integrations and real-time notifications
- **Performance at Scale**: Designed for high-volume transactions from the ground up

## Architecture Blueprint

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├────────────────┬──────────────┬────────────────┬────────────┤
│   Web SPA      │  Mobile App   │  WhatsApp Bot  │  External │
│   (React)      │  (React Native)│  (WebHook)     │  Systems  │
└────────────────┴──────────────┴────────────────┴────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    API Gateway Layer    │
                    │     (ElysiaJS + JWT)    │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                    Microservices Layer                       │
├──────────────┬────────────────┬────────────────┬───────────┤
│  Identity    │   Financial    │   Inventory    │    GST    │
│  Service     │   Ledger       │   Service      │  Service  │
├──────────────┼────────────────┼────────────────┼───────────┤
│  Invoice     │   Analytics    │   Notification │  Webhook  │
│  Service     │   Service      │   Service      │  Service  │
└──────────────┴────────────────┴────────────────┴───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    Event Bus Layer      │
                    │   (RabbitMQ/BullMQ)     │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────┐
│                      Data Layer                              │
├──────────────┬────────────────┬────────────────┬───────────┤
│  PostgreSQL  │     Redis      │  Data Warehouse │    S3     │
│  (Primary)   │   (Cache)      │  (Analytics)    │  (Files)  │
└──────────────┴────────────────┴────────────────┴───────────┘
```

### API-First Principles

1. **Contract-Driven Design**: OpenAPI specification defined before implementation
2. **Consistent API Style Guide**: 
   - RESTful resource naming (plural nouns)
   - Standardized error responses
   - Unified pagination strategies
   - Versioning strategy (URL-based for major, header-based for minor)
3. **Internal Dogfooding**: All clients consume same public API
4. **Developer Portal**: Interactive documentation with Swagger UI

### Event-Driven Architecture

```javascript
// Core Events Published
events = {
  // Financial Events
  'invoice.created', 'invoice.paid', 'invoice.voided',
  'payment.received', 'payment.failed',
  
  // Inventory Events  
  'inventory.low_stock', 'inventory.updated',
  'purchase_order.created', 'purchase_order.received',
  
  // GST Events
  'gstr.filed', 'gstr.pending', 'gstr.error',
  
  // System Events
  'user.created', 'tenant.onboarded', 'webhook.failed'
}
```

## Database Design

### Core Schema - Double-Entry Accounting

```sql
-- Multi-tenant support
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE,
    subscription_plan_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
    normal_balance ENUM('DEBIT', 'CREDIT'),
    parent_account_id UUID REFERENCES accounts(id),
    is_system_account BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Journal Entries (Transactions)
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    entry_date TIMESTAMP NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- 'invoice', 'payment', 'adjustment'
    reference_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_date (tenant_id, entry_date)
);

-- Journal Entry Lines (Double-Entry)
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id),
    account_id UUID REFERENCES accounts(id),
    type ENUM('DEBIT', 'CREDIT'),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    CONSTRAINT check_positive_amount CHECK (amount > 0),
    INDEX idx_entry (journal_entry_id)
);

-- Ensure balanced entries
CREATE OR REPLACE FUNCTION check_balanced_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END)
        FROM journal_entry_lines
        WHERE journal_entry_id = NEW.journal_entry_id
    ) != 0 THEN
        RAISE EXCEPTION 'Journal entry is not balanced';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Invoice & Credit Management

```sql
-- Invoices with state machine
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    invoice_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    invoice_date DATE NOT NULL,
    due_date DATE,
    status ENUM('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'VOID'),
    total_amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    linked_journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, invoice_number)
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    inventory_item_id UUID REFERENCES inventory_items(id),
    description TEXT,
    quantity DECIMAL(10,3),
    unit_price DECIMAL(15,2),
    tax_rate_id UUID REFERENCES tax_rates(id),
    line_total DECIMAL(15,2),
    INDEX idx_invoice (invoice_id)
);

-- Credit Notes
CREATE TABLE credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    credit_note_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    issue_date DATE NOT NULL,
    reason TEXT,
    total_amount DECIMAL(15,2),
    status ENUM('DRAFT', 'APPLIED', 'VOID'),
    linked_journal_entry_id UUID REFERENCES journal_entries(id),
    UNIQUE(tenant_id, credit_note_number)
);

-- Credit Note Applications (Many-to-Many)
CREATE TABLE credit_note_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID REFERENCES credit_notes(id),
    invoice_id UUID REFERENCES invoices(id),
    amount_applied DECIMAL(15,2),
    application_date TIMESTAMP,
    UNIQUE(credit_note_id, invoice_id)
);
```

### Inventory Management

```sql
-- Inventory Items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(8), -- For GST
    purchase_price DECIMAL(15,2),
    sale_price DECIMAL(15,2),
    reorder_point INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, sku)
);

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

-- Stock Levels (Current snapshot)
CREATE TABLE stock_levels (
    inventory_item_id UUID REFERENCES inventory_items(id),
    warehouse_id UUID REFERENCES warehouses(id),
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (inventory_item_id, warehouse_id)
);

-- Stock Movements (Audit trail)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    inventory_item_id UUID REFERENCES inventory_items(id),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    quantity INTEGER NOT NULL,
    reason ENUM('SALE', 'PURCHASE_RECEIPT', 'ADJUSTMENT_IN', 
                'ADJUSTMENT_OUT', 'TRANSFER'),
    reference_id UUID, -- Links to invoice_id, purchase_order_id, etc.
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    INDEX idx_item_date (inventory_item_id, movement_date)
);
```

### Multi-Tenant RBAC

```sql
-- Global Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles (System + Custom)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id), -- NULL for system roles
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(tenant_id, name)
);

-- User-Tenant-Role Mapping
CREATE TABLE tenant_users (
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    role_id UUID REFERENCES roles(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tenant_id)
);

-- Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
    resource VARCHAR(50) NOT NULL, -- 'invoice', 'customer', 'report'
    UNIQUE(action, resource)
);

-- Role-Permission Mapping
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

## API Design

### Authentication & Authorization

```yaml
# JWT-based authentication with refresh tokens
POST /api/v1/auth/login
  Request: { email, password }
  Response: { access_token, refresh_token, user }

POST /api/v1/auth/refresh
  Request: { refresh_token }
  Response: { access_token }

# OAuth 2.0 for mobile apps (PKCE flow)
GET  /api/v1/auth/oauth/authorize
POST /api/v1/auth/oauth/token
```

### Financial Ledger APIs

```yaml
# Journal Entries
POST /api/v1/journal-entries
  Request: {
    date, description,
    lines: [
      { account_id, type: "DEBIT", amount },
      { account_id, type: "CREDIT", amount }
    ]
  }

GET /api/v1/accounts/{account_id}/ledger
  Query: { from_date, to_date, page, limit }
  Response: { entries[], balance, page_info }

# Trial Balance
GET /api/v1/reports/trial-balance
  Query: { as_of_date }
  Response: { accounts[], total_debits, total_credits }
```

### Invoice Management

```yaml
# Invoice lifecycle
POST /api/v1/invoices
  Request: { customer_id, items[], due_date }
  Response: { invoice, journal_entry_id }

POST /api/v1/invoices/{id}/send
  Description: Transitions to SENT, creates journal entry
  Response: { invoice, email_status }

POST /api/v1/invoices/{id}/void
  Description: Creates reversing journal entry
  Response: { invoice, reversal_entry_id }

# Credit Notes
POST /api/v1/credit-notes
POST /api/v1/credit-notes/{id}/apply
  Request: { applications: [{ invoice_id, amount }] }
```

### Inventory APIs

```yaml
# Stock Management
GET /api/v1/stock-levels
  Query: { warehouse_id?, item_id?, low_stock_only? }

POST /api/v1/stock-adjustments
  Request: { item_id, warehouse_id, quantity, reason }
  Response: { movement_id, new_level }

POST /api/v1/stock-transfers
  Request: { item_id, from_warehouse, to_warehouse, quantity }
  Response: { movements[], updated_levels }

# Stock Movement History
GET /api/v1/stock-movements
  Query: { item_id?, period?, reason? }
  Response: { movements[], summary }
```

### GST Compliance

```yaml
# GST Calculations
POST /api/v1/gst/calculate
  Request: { amount, hsn_code, customer_state, business_state }
  Response: { cgst, sgst, igst, total_tax }

# Return Generation
POST /api/v1/gst/returns/gstr1/prepare
  Request: { period }
  Response: { b2b_invoices[], b2c_summary, hsn_summary }

POST /api/v1/gst/returns/gstr1/file
  Request: { return_data, otp }
  Response: { filing_status, acknowledgement }

# GSTR-2B Reconciliation
GET /api/v1/gst/gstr2b/fetch
POST /api/v1/gst/reconcile
  Request: { purchase_data, gstr2b_data }
  Response: { matched[], unmatched[], itc_eligible }
```

### Webhooks & Events

```yaml
# Webhook Management
POST /api/v1/webhooks
  Request: { url, events[], secret }
  Response: { webhook_id, verification_token }

GET /api/v1/webhooks/{id}/logs
  Response: { deliveries[], retry_attempts }

# Event Subscriptions
POST /api/v1/events/subscribe
  Request: { events[], callback_url }
```

## Security & Access Control

### RBAC Permission Matrix

| Resource | Permission | Owner | Admin | Sales Person |
|----------|-----------|-------|-------|--------------|
| **Invoices** | Create | ✓ | ✓ | ✓ |
| | Read (Own) | ✓ | ✓ | ✓ |
| | Read (All) | ✓ | ✓ | ✗ |
| | Update (All) | ✓ | ✓ | ✗ |
| | Delete | ✓ | ✓ | ✗ |
| | Void | ✓ | ✓ | ✗ |
| **Inventory** | Create | ✓ | ✓ | ✗ |
| | Read | ✓ | ✓ | ✓ |
| | Update | ✓ | ✓ | ✗ |
| | Adjust Stock | ✓ | ✓ | ✗ |
| **GST Returns** | Generate | ✓ | ✓ | ✗ |
| | File | ✓ | ✓ | ✗ |
| **Reports** | Financial | ✓ | ✓ | ✗ |
| | Sales | ✓ | ✓ | ✓ |
| **User Mgmt** | Invite | ✓ | ✓ | ✗ |
| | Remove | ✓ | ✗ | ✗ |
| **Billing** | Manage | ✓ | ✗ | ✗ |

### Security Implementation

```javascript
// ElysiaJS middleware for RBAC
export const requirePermission = (resource: string, action: string) => {
  return async ({ user, tenant, set }) => {
    const hasPermission = await checkPermission(
      user.id, 
      tenant.id, 
      resource, 
      action
    );
    
    if (!hasPermission) {
      set.status = 403;
      return { error: 'Insufficient permissions' };
    }
  };
};

// Usage in routes
app.put('/api/v1/invoices/:id', 
  requirePermission('invoice', 'update'),
  updateInvoiceHandler
);
```

## GST Compliance

### GSP Integration Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Our Platform   │────▶│  GSP Adapter     │────▶│ GSP Partner │
│                 │     │  (Anti-Corruption│     │   (API)     │
│                 │◀────│      Layer)      │◀────│             │
└─────────────────┘     └──────────────────┘     └──────┬──────┘
                                                          │
                                                    ┌─────▼─────┐
                                                    │   GSTN    │
                                                    └───────────┘
```

### GST Service Implementation

```typescript
// GSP-agnostic interface
interface IGspAdapter {
  fileGstr1(data: Gstr1Data): Promise<FilingResult>;
  fileGstr3b(data: Gstr3bData): Promise<FilingResult>;
  fetchGstr2b(period: string): Promise<Gstr2bData>;
  verifyGstin(gstin: string): Promise<GstinDetails>;
}

// Background job for GST filing
export class GstFilingJob {
  async process(job: Job) {
    const { tenantId, returnType, period } = job.data;
    
    // Aggregate data from database
    const returnData = await this.prepareReturn(tenantId, period);
    
    // Validate against GST rules
    await this.validateReturn(returnData);
    
    // Submit via GSP adapter
    const result = await this.gspAdapter.fileReturn(returnData);
    
    // Update filing status
    await this.updateFilingStatus(tenantId, period, result);
    
    // Send notification
    await this.notifyUser(tenantId, result);
  }
}
```

## Analytics & Reporting

### KPI Dashboard Metrics

| KPI | Category | Formula | Purpose |
|-----|----------|---------|---------|
| Monthly Sales Growth | Sales | (Current - Prior) / Prior × 100 | Revenue trend |
| Customer Acquisition Cost | Sales | Marketing Cost / New Customers | Efficiency metric |
| Inventory Turnover | Inventory | COGS / Average Inventory | Stock efficiency |
| Days on Hand | Inventory | (Avg Inventory / COGS) × 365 | Stock duration |
| Net Profit Margin | Financial | Net Income / Revenue × 100 | Profitability |
| Quick Ratio | Financial | (Current Assets - Inventory) / Liabilities | Liquidity |

### Analytics Pipeline

```
Production DB ──▶ CDC (Debezium) ──▶ Kafka ──▶ Data Warehouse
     │                                              │
     │                                              ▼
     │                                    Pre-aggregated Tables
     │                                              │
     ▼                                              ▼
Real-time APIs                            Analytics Dashboard
```

## Technology Stack

### Core Stack (Updated for Implementation)

| Component | Technology | Justification |
|-----------|------------|---------------|
| **Runtime** | Bun | High-performance JavaScript runtime |
| **Backend Framework** | ElysiaJS | Type-safe, fast, built for Bun |
| **Database** | PostgreSQL | ACID compliance for financial data |
| **ORM** | Prisma | Type-safe database access |
| **Cache** | Redis | Session management, caching |
| **Message Queue** | BullMQ | Background jobs, event processing |
| **Authentication** | JWT + ElysiaJS JWT Plugin | Stateless auth |
| **Analytics** | PostHog | Product analytics and monitoring |
| **PDF Generation** | Puppeteer | HTML to PDF conversion |
| **File Storage** | S3/MinIO | Document storage |
| **Container** | Docker | Consistent deployments |
| **Orchestration** | Kubernetes | Scalability and resilience |

### Development Tools

```json
{
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.0.0",
    "prisma": "^5.22.0",
    "@elysiajs/swagger": "^1.1.9"
  }
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
- [x] Project structure setup with Bun workspaces
- [ ] PostgreSQL schema with Prisma
- [ ] Core ElysiaJS API with JWT auth
- [ ] Multi-tenant data isolation
- [ ] Basic RBAC implementation

### Phase 2: Financial Core (Week 3-4)
- [ ] Double-entry accounting engine
- [ ] Chart of accounts management
- [ ] Journal entry processing
- [ ] Trial balance generation
- [ ] Account ledgers

### Phase 3: Business Operations (Week 5-6)
- [ ] Invoice management with state machine
- [ ] Credit/Debit note handling
- [ ] Inventory tracking system
- [ ] Stock movement ledger
- [ ] Purchase order management

### Phase 4: GST & Compliance (Week 7-8)
- [ ] GST calculation engine
- [ ] HSN/SAC code management
- [ ] GSTR-1 generation
- [ ] GSTR-3B preparation
- [ ] GSP adapter implementation

### Phase 5: Analytics & Intelligence (Week 9-10)
- [ ] PostHog integration
- [ ] KPI calculations
- [ ] Real-time dashboards
- [ ] Report generation
- [ ] Data export capabilities

### Phase 6: Extensions (Week 11-12)
- [ ] Webhook system
- [ ] Event bus implementation
- [ ] WhatsApp bot integration
- [ ] Mobile API optimization
- [ ] Third-party integrations

### Monitoring & Operations

```typescript
// PostHog tracking
export const trackEvent = (event: string, properties: any) => {
  posthog.capture({
    distinctId: properties.userId,
    event,
    properties: {
      ...properties,
      tenant: properties.tenantId,
      timestamp: new Date().toISOString()
    }
  });
};

// Usage
trackEvent('invoice.created', {
  userId: user.id,
  tenantId: tenant.id,
  invoiceAmount: invoice.total,
  customerType: customer.type
});
```

## Performance & Scalability

### Database Optimization
- Proper indexing on frequently queried columns
- Partitioning for large tables (journal_entries by date)
- Read replicas for analytics queries
- Connection pooling with PgBouncer

### API Performance
- Response caching with Redis
- Pagination for list endpoints
- GraphQL for flexible data fetching
- Rate limiting per tenant

### Background Processing
- Async processing for heavy operations
- Job queues for GST filing
- Scheduled jobs for report generation
- Event-driven notifications

## Deployment & DevOps

### Container Strategy
```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### CI/CD Pipeline
```yaml
# GitHub Actions
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run typecheck
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t accounts-api .
      - run: kubectl apply -f k8s/
```

## Compliance & Auditing

### Audit Trail Requirements
- All financial transactions logged
- User actions tracked with timestamp
- Data changes recorded with before/after values
- Immutable audit log storage

### Data Protection
- Encryption at rest (AES-256)
- TLS 1.3 for data in transit
- PII data masking in logs
- GDPR compliance for data retention

### Backup Strategy
- Daily automated PostgreSQL backups
- Point-in-time recovery capability
- Cross-region backup replication
- Regular disaster recovery testing

## Success Metrics

### Technical KPIs
- API response time < 200ms (p95)
- System uptime > 99.9%
- Database query time < 50ms (p95)
- Background job success rate > 99%

### Business KPIs
- User onboarding time < 5 minutes
- Invoice creation time < 2 minutes
- GST filing accuracy > 99.9%
- Customer satisfaction score > 4.5/5

## Conclusion

This architectural blueprint provides a comprehensive foundation for building a modern, scalable, and competitive accounting platform for the Indian market. The API-first, event-driven design ensures extensibility and future growth, while the robust financial core maintains data integrity and compliance. With ElysiaJS, PostgreSQL, and PostHog as the core technologies, the platform is positioned for high performance and deep analytics capabilities.