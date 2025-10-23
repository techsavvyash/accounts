# Agents.md - Business Accounts Management Platform Features

This document serves as the ground truth for all implemented features, commands, styles, and structures in the Business Accounts Management Platform. It is a comprehensive accounting system built for the Indian market with GST compliance.

## Core Features Implemented

### 1. Multi-Tenant SaaS Architecture
- Complete tenant isolation with data separation
- User management across multiple businesses
- Subscription plan support
- Global user accounts with tenant-specific roles

### 2. Double-Entry Accounting System
- Chart of Accounts management (Asset, Liability, Equity, Revenue, Expense)
- Journal entries with balanced debits/credits
- Account ledgers and trial balance generation
- Financial transaction audit trail
- Automated journal entry creation from business operations

### 3. Invoice Management
- Complete invoice lifecycle: Draft → Sent → Paid/Partially Paid → Void
- PDF generation and email delivery
- Line items with tax calculations
- Customer management with GSTIN/PAN
- Invoice numbering and due date tracking
- State machine for invoice status transitions

### 4. Credit Notes & Debit Notes
- Credit note creation and management
- Application of credit notes to outstanding invoices
- Debit note support for purchase adjustments
- Linked journal entries for financial accuracy

### 5. Inventory Management System
- Multi-warehouse stock tracking
- Real-time stock level monitoring
- Stock movement audit trail (Sales, Purchases, Adjustments, Transfers)
- Low stock alerts and reorder point management
- SKU-based item management with HSN codes
- Purchase order integration

### 6. Purchase Order Management
- Purchase order creation and tracking
- Supplier management
- Order status: Draft → Ordered → Partially Received → Received → Cancelled
- Integration with inventory receipts
- Cost tracking and supplier relationships

### 7. GST Compliance & Taxation
- GST calculation engine (CGST, SGST, IGST)
- HSN/SAC code management
- GSTR-1 (Outward Supplies) generation
- GSTR-3B (Summary Return) preparation
- Place of Supply rules implementation
- Tax rate configuration
- GSP (GST Suvidha Provider) integration ready

### 8. Role-Based Access Control (RBAC)
- Three system roles: Owner, Admin, Sales Person
- Granular permissions: Create, Read (Own/All), Update, Delete
- Tenant-specific custom roles support
- Permission matrix enforcement
- User invitation and role assignment

### 9. Analytics & Business Intelligence
- KPI dashboards with key metrics:
  - Monthly Sales Growth
  - Customer Acquisition Cost (CAC)
  - Customer Lifetime Value (CLV)
  - Inventory Turnover Rate
  - Days on Hand (DOH)
  - Backorder Rate
  - Net Profit Margin
  - Quick Ratio (liquidity)
- Analytics snapshots for historical tracking
- PostHog integration for product analytics
- Real-time business metrics

### 10. API-First Architecture
- OpenAPI 3.0 specification
- RESTful endpoints with consistent patterns
- Swagger UI documentation
- JWT authentication with refresh tokens
- OAuth 2.0 PKCE for mobile apps
- Rate limiting and request validation
- Comprehensive error handling

### 11. Event-Driven Architecture
- Webhook system for external integrations
- Event publishing for business operations
- Asynchronous processing with background jobs
- Event types: invoice.created, payment.received, inventory.low_stock, etc.
- Retry logic and delivery tracking

### 12. PDF Generation & Document Management
- Server-side PDF creation using Puppeteer
- Professional invoice templates
- Email delivery with PDF attachments
- File storage integration (S3/MinIO ready)

### 13. Security & Compliance
- Encrypted password storage (bcrypt)
- JWT with HttpOnly cookies for web
- CSRF protection
- Audit trails for all financial transactions
- Data encryption at rest
- GDPR-compliant data handling

### 14. Multi-Client Support
- Web application (Next.js with React)
- Mobile API optimization
- WhatsApp Business API integration ready
- Third-party integration support

### 15. Background Processing & Automation
- BullMQ for job queues
- Async GST return filing
- Automated notifications
- Scheduled report generation
- Event processing workers

## Technology Stack

### Backend
- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: ElysiaJS (TypeScript-first web framework)
- **Database**: PostgreSQL (ACID-compliant for financial data)
- **ORM**: Prisma (type-safe database access)
- **Cache**: Redis (session management, caching)
- **Queue**: BullMQ (background jobs)
- **Auth**: JWT with ElysiaJS plugins
- **PDF**: Puppeteer (HTML to PDF)

### Frontend
- **Framework**: Next.js 14 (React-based)
- **UI**: Radix UI components with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **State**: React hooks and context

### Packages
- **Database**: Prisma schema with full financial models
- **GST**: Tax calculation and compliance utilities
- **Analytics**: PostHog integration for tracking
- **Webhooks**: Event publishing and delivery system
- **Shared**: Common types and utilities with Zod schemas
- **UI**: Reusable React components (planned)

## Database Schema Overview

### Core Tables
- `tenants` - Multi-tenant business entities
- `users` - Global user accounts
- `tenant_users` - User-tenant-role mappings
- `roles` & `permissions` - RBAC system

### Financial Tables
- `accounts` - Chart of Accounts
- `journal_entries` & `journal_entry_lines` - Double-entry transactions
- `invoices` & `invoice_line_items` - Invoice management
- `credit_notes` & `credit_note_applications` - Credit note handling

### Inventory Tables
- `inventory_items` - Product catalog
- `warehouses` - Multi-location support
- `stock_levels` - Current stock snapshots
- `stock_movements` - Audit trail of all stock changes
- `purchase_orders` - Procurement management

### Compliance Tables
- `tax_rates` - GST rate configurations
- `gst_returns` - Filed return records
- `customers` & `suppliers` - Business contacts

### System Tables
- `webhooks` & `webhook_deliveries` - Event system
- `analytics_snapshots` - Business metrics
- `refresh_tokens` - Auth tokens

## API Endpoints (Major Groups)

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - Logout

### Financial Ledger
- `GET /api/v1/accounts` - Chart of accounts
- `POST /api/v1/journal-entries` - Create transactions
- `GET /api/v1/accounts/{id}/ledger` - Account ledger
- `GET /api/v1/reports/trial-balance` - Trial balance

### Invoice Management
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices/{id}/send` - Send invoice
- `POST /api/v1/invoices/{id}/void` - Void invoice

### Inventory
- `GET /api/v1/inventory-items` - Product catalog
- `GET /api/v1/stock-levels` - Current stock
- `POST /api/v1/stock-adjustments` - Adjust stock
- `GET /api/v1/stock-movements` - Movement history

### GST Compliance
- `POST /api/v1/gst/calculate` - Tax calculations
- `POST /api/v1/gst/returns/gstr1/prepare` - GSTR-1 prep
- `POST /api/v1/gst/returns/gstr1/file` - File GSTR-1
- `GET /api/v1/gst/gstr2b/fetch` - Fetch GSTR-2B

### Analytics
- `GET /api/v1/analytics/kpis` - KPI dashboard
- `GET /api/v1/analytics/snapshots` - Historical data

### Webhooks
- `POST /api/v1/webhooks` - Register webhook
- `GET /api/v1/webhooks/{id}/logs` - Delivery logs

## Development Commands

### Package Management
```bash
bun install          # Install dependencies
bun run dev          # Run all services (API + Web)
bun run dev:api      # Run API server
bun run dev:web      # Run web app
bun run build        # Build all packages/apps
bun run test         # Run all tests
bun run lint         # Lint all code
bun run typecheck    # TypeScript checking
```

### Database Operations
```bash
bun run db:generate  # Generate Prisma client
bun run db:push      # Push schema to database
bun run db:migrate   # Run migrations
bun run db:studio    # Open Prisma Studio
bun run db:seed      # Seed database
```

### Testing
```bash
bun test                    # Run all tests
bun run test:e2e            # Run E2E tests
bun run test:auth           # Test authentication
bun run test:inventory      # Test inventory features
bun run test:invoice        # Test invoice management
bun run test:gst            # Test GST compliance
bun run test:webhooks       # Test webhook system
bun run test:analytics      # Test analytics
```

## Deployment Architecture

### Services
- **API Service**: ElysiaJS application handling all business logic
- **Web Service**: Next.js application for user interface
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis for sessions, BullMQ for jobs
- **Storage**: S3/MinIO for file storage

### Containerization
- Docker containers for all services
- Kubernetes orchestration for scalability
- CI/CD with GitHub Actions

## Security Features

### Authentication Methods
- JWT with refresh tokens for web clients
- OAuth 2.0 PKCE for mobile applications
- API keys for server-to-server communication

### Authorization
- Role-based access control with granular permissions
- Tenant-scoped user roles
- API endpoint protection with middleware
- Audit logging for sensitive operations

### Data Protection
- Password hashing with bcrypt
- Database encryption for sensitive fields
- HTTPS/TLS for all communications
- Rate limiting and request validation

## Monitoring & Analytics

### Application Monitoring
- PostHog for product analytics and user tracking
- Error tracking and performance monitoring
- API usage analytics
- Business metric dashboards

### System Health
- Database connection monitoring
- Background job success rates
- API response time tracking
- System uptime monitoring

## Compliance Features

### GST Compliance
- Automated tax calculations
- Return generation (GSTR-1, GSTR-3B)
- Place of Supply determination
- Input Tax Credit reconciliation
- Filing status tracking

### Financial Compliance
- Double-entry bookkeeping principles
- Immutable transaction records
- Audit trails for all changes
- Financial report accuracy

### Data Compliance
- Tenant data isolation
- User data privacy
- Secure credential management
- Regular security audits

## Future Extensions

### Planned Features
- WhatsApp Business API integration
- Mobile application (React Native)
- Advanced reporting with data warehouse
- Third-party integrations (payment gateways, CRM)
- Multi-currency support
- Branch accounting
- Payroll management

### Integration Points
- Payment gateway integrations
- E-commerce platform sync
- CRM system connections
- Accounting software imports
- Bank statement reconciliation

## Performance Characteristics

### API Performance
- Target: <200ms p95 response time
- Pagination for all list endpoints
- Redis caching for frequently accessed data
- Database query optimization with proper indexing

### Scalability
- Horizontal scaling with Kubernetes
- Database read replicas for analytics
- CDN for static assets
- Background job processing for heavy operations

### Reliability
- 99.9% uptime target
- Database backups and point-in-time recovery
- Graceful error handling
- Circuit breakers for external services

---

This document serves as the authoritative reference for all platform capabilities and should be updated as new features are implemented or existing ones are modified.
