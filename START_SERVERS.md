# Start Servers for E2E Testing

## Quick Start

You need **two terminal windows**:

### Terminal 1: Start Heimdall Server

```bash
cd ~/Documents/sweatAndBlood/sabbatical/heimdall

# Start Docker services (PostgreSQL, Redis, FusionAuth)
make dev

# Wait about 30 seconds for services to initialize...

# Build Heimdall
make build

# Run Heimdall server
make run
```

**Verify Heimdall is running:**
```bash
curl http://localhost:8080/health
# Expected: {"status":"healthy","timestamp":"..."}
```

### Terminal 2: Start Accounts API

```bash
cd ~/sweatAndBlood/JBG/accounts

# Make sure database is migrated
bun run db:migrate

# Start the API server
cd apps/api
bun run dev
```

**Verify API is running:**
```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","authProvider":"heimdall",...}
```

## Once Both Are Running

Come back and I'll run the E2E tests using Playwright MCP!

## Troubleshooting

### Heimdall won't start

```bash
# Check if Docker is running
docker ps

# Check Docker services
cd ~/Documents/sweatAndBlood/sabbatical/heimdall
make logs
```

### API won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
lsof -ti:3000 | xargs kill -9

# Try again
cd apps/api
bun run dev
```

### Database errors

```bash
# Run migrations
cd ~/sweatAndBlood/JBG/accounts
bun run db:migrate

# If needed, run seed data
cd packages/database
bun run seed
```
