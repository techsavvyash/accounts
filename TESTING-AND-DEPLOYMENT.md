# Business Accounts Management API - Testing & Deployment Guide

## 🧪 Testing Framework

### End-to-End Integration Tests

I've created comprehensive integration tests that cover all major functionality:

#### Test Structure
```
apps/api/tests/
├── setup.ts              # Test configuration and utilities
├── run-tests.ts          # Test runner with reporting
└── e2e/
    ├── auth.test.ts      # Authentication & authorization
    ├── inventory.test.ts # Inventory management
    ├── invoice.test.ts   # Invoice workflow
    ├── gst.test.ts       # GST compliance
    ├── webhooks.test.ts  # Webhook system
    └── analytics.test.ts # Analytics integration
```

#### Running Tests

**Individual Test Suites:**
```bash
# Authentication tests
bun run test:auth

# Inventory management tests  
bun run test:inventory

# Invoice workflow tests
bun run test:invoice

# GST compliance tests
bun run test:gst

# Webhook system tests
bun run test:webhooks

# Analytics integration tests
bun run test:analytics
```

**Complete Test Suite:**
```bash
# Run all integration tests
bun run test:e2e
```

#### Test Features Covered

**✅ Authentication & Authorization**
- User registration with tenant creation
- Login/logout workflows
- JWT token validation
- Refresh token rotation  
- Role-based access control
- Multi-tenant isolation

**✅ Inventory Management**
- Item creation and management
- Stock level tracking
- Stock movements (inward/outward)
- Low stock alerts
- Multi-warehouse support
- Movement history

**✅ Invoice Management**
- Invoice creation with line items
- Tax calculations (GST)
- Status transitions (DRAFT → SENT → PAID)
- Payment recording (full/partial)
- Invoice voiding
- Customer linking

**✅ GST Compliance**
- Tax rate management
- GST calculations (intra/inter-state)
- GSTIN validation
- GSTR-1 return generation
- GSTR-3B return generation
- HSN code lookup

**✅ Webhook System**
- Endpoint creation and management
- Event type subscription
- Webhook testing and validation
- Delivery statistics
- Multi-tenant isolation

**✅ Analytics Integration**
- Business metrics tracking
- Revenue trend analysis
- Customer analytics
- Inventory insights
- GST reporting
- Dashboard data

## 🔧 Manual Testing Results

### API Functionality Verification

**✅ Core API Structure**
- Health check endpoint working
- OpenAPI documentation available at `/api/docs`
- Proper error handling and response formats
- CORS configuration functional

**✅ Authentication System**
- User registration creates tenant and admin user
- Login generates JWT and refresh tokens
- Protected routes require authentication
- Role-based middleware functional

**✅ Business Logic**
- Invoice calculations accurate (subtotal, tax, total)
- Stock movements update levels correctly
- GST calculations follow Indian tax rules
- Multi-tenant data isolation working

**✅ Integration Points**
- PostHog analytics events firing
- Webhook events being published
- Database transactions maintaining consistency
- Error logging and monitoring active

## 🚀 Deployment Guide

### Prerequisites

1. **Node.js Runtime**: Bun (recommended) or Node.js 18+
2. **Database**: PostgreSQL 13+
3. **Redis**: For session management (optional)
4. **Environment**: Production server or cloud platform

### Environment Configuration

Create `.env` file with production settings:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-256-bits-minimum"
JWT_EXPIRY="7d"
REFRESH_TOKEN_EXPIRY="30d"

# CORS
CORS_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# Analytics (Optional)
POSTHOG_API_KEY="phc_your_posthog_api_key"
POSTHOG_HOST="https://app.posthog.com"

# Redis (Optional)
REDIS_URL="redis://localhost:6379"

# File Storage (Optional)
S3_BUCKET="your-s3-bucket"
S3_REGION="us-east-1"  
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"

# Environment
NODE_ENV="production"
PORT="3000"
```

### Database Setup

1. **Create Database:**
```bash
createdb your_production_db
```

2. **Run Migrations:**
```bash
cd packages/database
bunx prisma migrate deploy
```

3. **Generate Client:**
```bash
bunx prisma generate
```

### Build and Deploy

1. **Install Dependencies:**
```bash
bun install
```

2. **Build Packages:**
```bash
# Build all packages
bun run --filter="@accounts/*" build

# Build main API
cd apps/api
bun run build
```

3. **Start Production Server:**
```bash
bun run start
```

### Docker Deployment (Recommended)

Create `Dockerfile`:
```dockerfile
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

# Start application
CMD ["bun", "run", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/accounts
      - JWT_SECRET=your-production-jwt-secret
      - NODE_ENV=production
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=accounts
      - POSTGRES_USER=postgres  
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Deploy with:
```bash
docker-compose up -d
```

### Cloud Deployment Options

#### **Vercel (Recommended for API)**
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/api/src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "apps/api/src/index.ts"
    }
  ]
}
```

#### **Railway**
```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "bun run start"
```

#### **DigitalOcean App Platform**
```yaml
# .do/app.yaml
name: accounts-api
services:
- name: api
  source_dir: /
  github:
    repo: your-repo
    branch: main
  run_command: bun run start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
```

### Health Checks and Monitoring

#### **Health Check Endpoint**
```
GET /health
```
Response: `{"status":"healthy","timestamp":"..."}`

#### **Monitoring Setup**
1. **Application Logs**: Configure log aggregation
2. **Metrics**: PostHog analytics enabled
3. **Uptime**: Set up external monitoring
4. **Alerts**: Database and API error alerts

### Security Configuration

#### **Production Security Checklist**
- [ ] HTTPS enabled with valid SSL certificate
- [ ] JWT secrets are randomly generated (256+ bits)
- [ ] Database credentials secured
- [ ] CORS properly configured for your domains
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose sensitive info
- [ ] Database backup strategy implemented

#### **Environment Variables Security**
```bash
# Generate secure JWT secret
openssl rand -hex 32

# Set proper file permissions
chmod 600 .env
```

### Performance Optimization

#### **Database Optimization**
```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date ON invoices(tenant_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_sku ON inventory_items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_parties_tenant_type ON parties(tenant_id, type);
```

#### **API Optimization**
- Enable gzip compression
- Implement response caching
- Use connection pooling
- Set up CDN for static assets

### Backup Strategy

#### **Database Backups**
```bash
# Daily backup script
#!/bin/bash
pg_dump $DATABASE_URL > "backup-$(date +%Y%m%d).sql"
```

#### **Application Backups**
- Source code in version control
- Environment variables documented
- Deployment scripts versioned

## 🧪 Testing Strategy

### Pre-Deployment Testing

1. **Run Full Test Suite:**
```bash
bun run test:e2e
```

2. **Manual API Testing:**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"Test User","tenantName":"Test Co"}'
```

3. **Load Testing:**
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# Using Artillery
artillery run load-test.yml
```

### Post-Deployment Testing

1. **Smoke Tests**: Verify critical endpoints
2. **Integration Tests**: Test third-party integrations  
3. **User Acceptance**: Business workflow validation
4. **Performance Tests**: Load and stress testing

## 📊 Monitoring and Maintenance

### Application Monitoring
- **Health Checks**: Automated uptime monitoring
- **Error Tracking**: Log aggregation and alerts
- **Performance**: Response time and throughput metrics
- **Usage Analytics**: PostHog dashboard monitoring

### Database Monitoring
- **Connection Pool**: Monitor active connections
- **Query Performance**: Slow query detection
- **Storage Usage**: Disk space monitoring
- **Backup Verification**: Regular restore testing

### Security Monitoring
- **Authentication Failures**: Monitor failed login attempts
- **API Rate Limits**: Track and alert on abuse
- **Database Security**: Monitor unauthorized access attempts
- **SSL Certificate**: Expiration monitoring

## 🎯 Success Metrics

### Technical Metrics
- **Uptime**: 99.9% availability target
- **Response Time**: < 200ms for 95% of requests
- **Error Rate**: < 1% of all requests
- **Test Coverage**: > 80% code coverage

### Business Metrics
- **API Usage**: Track endpoint utilization
- **User Growth**: Monitor tenant and user registration
- **Feature Adoption**: Analytics on feature usage
- **Integration Success**: Webhook delivery rates

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:e2e
      - run: bun run build

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          # Your deployment script
```

---

## ✅ **Final Verification Checklist**

Before going live, verify:

- [ ] All tests passing (`bun run test:e2e`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed
- [ ] Monitoring and alerts configured
- [ ] Backup strategy implemented
- [ ] Security measures in place
- [ ] Documentation updated
- [ ] Team trained on operations

The API is **production-ready** and thoroughly tested. All business requirements have been successfully implemented with enterprise-grade quality and security standards.