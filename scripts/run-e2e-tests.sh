#!/bin/bash

# Script to run E2E tests for Heimdall integration
# This script checks prerequisites and runs the Playwright tests

set -e

echo "🧪 Heimdall Authentication E2E Tests"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Heimdall is running
echo "1️⃣  Checking Heimdall server..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Heimdall server is running${NC}"
else
    echo -e "${RED}❌ Heimdall server is not running${NC}"
    echo ""
    echo "Please start Heimdall server first:"
    echo "  cd ~/Documents/sweatAndBlood/sabbatical/heimdall"
    echo "  make dev && make build && make run"
    echo ""
    exit 1
fi

# Check if API is running (optional - Playwright can start it)
echo ""
echo "2️⃣  Checking if API needs to be started..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  API server is already running${NC}"
    echo "   Tests will use the running server"
    export SKIP_SERVER_START=true
else
    echo -e "${GREEN}✅ API will be auto-started by Playwright${NC}"
fi

# Run the tests
echo ""
echo "3️⃣  Running Playwright E2E tests..."
echo ""

npx playwright test tests/e2e/heimdall-auth.e2e.ts

# Show results
echo ""
echo "======================================"
echo -e "${GREEN}✅ Tests complete!${NC}"
echo ""
echo "View detailed report:"
echo "  bun run test:e2e:report"
echo ""
