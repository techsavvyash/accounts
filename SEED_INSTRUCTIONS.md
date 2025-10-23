# Database Seeding Instructions

## Available Seed Scripts

### 1. Basic Seed (Roles & Permissions)
Seeds only roles, permissions, and tax rates (no users or data).

```bash
cd packages/database
bun run db:seed
```

### 2. Demo Seed (Users Only)
Seeds basic demo users with roles.

```bash
cd packages/database
bun run db:seed:demo
```

### 3. Complete Seed (Full Demo Data) ⭐ RECOMMENDED
Seeds everything: users, customers, suppliers, inventory, and invoices with GST data.

```bash
cd packages/database
bun run db:seed:complete
```

## Test Credentials

After running the complete seed:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@demo.com | admin123 |
| **Owner** | owner@demo.com | owner123 |
| **Sales Person** | sales@demo.com | sales123 |

## Seeded Data Summary

### Tenant
- **TechCorp India Pvt Ltd**
- GSTIN: 27AABCT1332L1ZM (Maharashtra)
- Complete business profile with address and contact details

### Customers (3)
1. **Acme Corporation** - Maharashtra (Intra-state GST testing)
2. **Global Enterprises** - Karnataka (Inter-state GST testing)
3. **Frontend Test Co** - Haryana (Inter-state GST testing)

### Suppliers (2)
1. **Electronics Wholesale Ltd** - Maharashtra
2. **Mobile Parts Distributor** - Uttar Pradesh

### Inventory Items (5)
1. HP EliteBook 840 G8 - ₹85,000 (HSN: 85171200)
2. iPhone 14 Pro 256GB - ₹135,000 (HSN: 85171200)
3. iPad Air 5th Gen - ₹72,000 (HSN: 85171200)
4. Dell UltraSharp 27" 4K - ₹48,000 (HSN: 85285210)
5. Logitech MX Keys - ₹12,500 (HSN: 84716070)

### Invoices (3)
1. **INV-2024-001** - Acme Corporation (Intra-state) - ₹100,000
2. **INV-2024-002** - Global Enterprises (Inter-state) - ₹270,000
3. **INV-2024-003** - Frontend Test Co (Inter-state) - ₹160,000

## GST Test Scenarios

The seeded data includes perfect scenarios for testing:

### Intra-State Transactions (CGST + SGST)
- **Acme Corporation** (Maharashtra) ↔ TechCorp (Maharashtra)
- Both in the same state, so GST splits into CGST (9%) + SGST (9%)

### Inter-State Transactions (IGST)
- **Global Enterprises** (Karnataka) ↔ TechCorp (Maharashtra)
- **Frontend Test Co** (Haryana) ↔ TechCorp (Maharashtra)
- Different states, so uses IGST (18%)

## Quick Start Guide

1. **Start PostgreSQL**
   ```bash
   docker compose up -d
   ```

2. **Run migrations**
   ```bash
   cd packages/database
   bunx prisma migrate dev
   ```

3. **Seed complete demo data**
   ```bash
   bun run db:seed:complete
   ```

4. **Start the application**
   ```bash
   cd ../..
   bun run dev
   ```

5. **Login**
   - Navigate to http://localhost:3001
   - Use any of the test credentials above

## Resetting Database

To start fresh:

```bash
# Drop and recreate database
docker compose down -v
docker compose up -d

# Run migrations
cd packages/database
bunx prisma migrate dev

# Seed data
bun run db:seed:complete
```

## Notes

- All passwords are hashed using bcrypt
- GSTINs follow the correct format with valid state codes
- HSN codes are accurate for the product categories
- Invoice amounts include proper GST calculations
- Data is designed to test both intra-state and inter-state GST scenarios
