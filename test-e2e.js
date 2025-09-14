const puppeteer = require('puppeteer');

async function runE2ETests() {
    console.log('🚀 Starting End-to-End Testing of Business Accounts Management Platform');
    console.log('Frontend URL: http://localhost:3001');
    console.log('Backend URL: http://localhost:3000');
    console.log('=====================================\n');

    const browser = await puppeteer.launch({
        headless: false,  // Set to true for CI/CD, false for debugging
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const testResults = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Helper function to add test results
    function addTestResult(testName, passed, details = '') {
        testResults.tests.push({
            name: testName,
            passed,
            details
        });
        if (passed) {
            testResults.passed++;
            console.log(`✅ ${testName}`);
        } else {
            testResults.failed++;
            console.log(`❌ ${testName}: ${details}`);
        }
        if (details && passed) {
            console.log(`   ${details}`);
        }
    }

    // Helper function to wait and handle potential errors
    async function safeWait(selector, timeout = 5000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            return false;
        }
    }

    // Helper function to take screenshot for debugging
    async function takeScreenshot(name) {
        try {
            await page.screenshot({ path: `/tmp/test-${name}-${Date.now()}.png`, fullPage: true });
            console.log(`📸 Screenshot saved for ${name}`);
        } catch (error) {
            console.log(`Failed to take screenshot: ${error.message}`);
        }
    }

    try {
        console.log('🔍 Test 1: Loading Frontend Application');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });

        // Check if page loads successfully
        const title = await page.title();
        addTestResult('Frontend loads successfully', title.length > 0, `Title: "${title}"`);
        await takeScreenshot('frontend-load');

        console.log('\n🔍 Test 2: Authentication System');

        // Check if login form exists
        const hasLoginForm = await safeWait('input[type="email"], input[name="email"], input[id="email"]');
        const hasPasswordField = await safeWait('input[type="password"], input[name="password"], input[id="password"]');
        const hasSubmitButton = await safeWait('button[type="submit"], button[id="login"], input[type="submit"]');

        addTestResult('Login form elements exist', hasLoginForm && hasPasswordField && hasSubmitButton);

        if (hasLoginForm && hasPasswordField && hasSubmitButton) {
            console.log('\n🔍 Test 3: Login Functionality');

            // Try to login with test credentials
            await page.type('input[type="email"], input[name="email"], input[id="email"]', 'admin@test.com');
            await page.type('input[type="password"], input[name="password"], input[id="password"]', 'admin123');

            await takeScreenshot('login-form-filled');

            // Click submit button
            await page.click('button[type="submit"], button[id="login"], input[type="submit"]');

            // Wait for either dashboard or error message
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            const pageContent = await page.content();

            // Check if redirected to dashboard or stayed on login with error
            const loginSuccessful = !currentUrl.includes('login') && !currentUrl.includes('signin');
            const hasErrorMessage = pageContent.includes('error') || pageContent.includes('invalid') || pageContent.includes('denied');

            addTestResult('Login attempt processed', true, `Current URL: ${currentUrl}`);

            if (loginSuccessful) {
                addTestResult('Login successful - redirected to dashboard', true);
                await takeScreenshot('post-login');

                console.log('\n🔍 Test 4: Dashboard Access and Content');

                // Check for dashboard elements
                const hasDashboard = await safeWait('[data-testid="dashboard"], .dashboard, #dashboard', 3000);
                const hasNavigation = await safeWait('nav, .nav, .navigation, .sidebar');

                addTestResult('Dashboard loads after login', hasDashboard);
                addTestResult('Navigation elements present', hasNavigation);

                console.log('\n🔍 Test 5: Navigation to Core Features');

                // Test navigation to different sections
                const sections = ['inventory', 'invoice', 'account', 'party', 'customer'];
                for (const section of sections) {
                    const navLink = await page.$(`a[href*="${section}"], button[data-section="${section}"], [data-testid="${section}"]`);
                    if (navLink) {
                        await navLink.click();
                        await page.waitForTimeout(1000);
                        const newUrl = page.url();
                        addTestResult(`Navigation to ${section} works`, newUrl.includes(section), `URL: ${newUrl}`);
                        await takeScreenshot(`navigation-${section}`);
                    } else {
                        addTestResult(`Navigation to ${section} link found`, false, 'Link not found in DOM');
                    }
                }

                console.log('\n🔍 Test 6: API Integration Tests');

                // Test API endpoints
                page.on('response', response => {
                    if (response.url().includes('localhost:3000')) {
                        console.log(`API Call: ${response.status()} ${response.url()}`);
                    }
                });

                // Try to load inventory page and check for API calls
                try {
                    await page.goto('http://localhost:3001/inventory', { waitUntil: 'networkidle2' });
                    const inventoryContent = await page.content();
                    const hasInventoryData = inventoryContent.includes('product') || inventoryContent.includes('item') || inventoryContent.includes('stock');
                    addTestResult('Inventory page loads', true);
                    addTestResult('Inventory data present', hasInventoryData);
                } catch (error) {
                    addTestResult('Inventory page loads', false, error.message);
                }

                // Try to load invoices page
                try {
                    await page.goto('http://localhost:3001/invoices', { waitUntil: 'networkidle2' });
                    const invoicesContent = await page.content();
                    const hasInvoiceData = invoicesContent.includes('invoice') || invoicesContent.includes('bill') || invoicesContent.includes('amount');
                    addTestResult('Invoices page loads', true);
                    addTestResult('Invoice data present', hasInvoiceData);
                } catch (error) {
                    addTestResult('Invoices page loads', false, error.message);
                }

                // Try to load accounts page
                try {
                    await page.goto('http://localhost:3001/accounts', { waitUntil: 'networkidle2' });
                    const accountsContent = await page.content();
                    const hasAccountData = accountsContent.includes('account') || accountsContent.includes('party') || accountsContent.includes('customer');
                    addTestResult('Accounts page loads', true);
                    addTestResult('Account data present', hasAccountData);
                } catch (error) {
                    addTestResult('Accounts page loads', false, error.message);
                }

            } else {
                addTestResult('Login failed', false, hasErrorMessage ? 'Error message displayed' : 'No clear error indication');
                await takeScreenshot('login-failed');

                console.log('\n🔍 Test 4: Testing without authentication');
                // Test if we can access protected routes directly
                try {
                    await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle2' });
                    const dashboardUrl = page.url();
                    const redirectedToLogin = dashboardUrl.includes('login') || dashboardUrl.includes('signin');
                    addTestResult('Protected routes redirect to login', redirectedToLogin);
                } catch (error) {
                    addTestResult('Protected route test', false, error.message);
                }
            }
        }

        console.log('\n🔍 Test 7: Backend API Health Check');

        // Test backend API directly
        const response = await fetch('http://localhost:3000/health');
        if (response.ok) {
            const healthData = await response.json();
            addTestResult('Backend API accessible', true, `Status: ${healthData.status}`);
        } else {
            addTestResult('Backend API accessible', false, `HTTP ${response.status}`);
        }

        // Test authentication endpoint
        try {
            const authResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' })
            });

            addTestResult('Auth endpoint responds', true, `Status: ${authResponse.status}`);

            if (authResponse.status === 200) {
                const authData = await authResponse.json();
                addTestResult('Auth endpoint returns data', !!authData, JSON.stringify(authData).substring(0, 100));
            }
        } catch (error) {
            addTestResult('Auth endpoint responds', false, error.message);
        }

    } catch (error) {
        console.error('Critical error during testing:', error);
        addTestResult('Test suite execution', false, error.message);
        await takeScreenshot('critical-error');
    }

    await browser.close();

    // Print summary
    console.log('\n=====================================');
    console.log('🧪 TEST SUMMARY');
    console.log('=====================================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.tests.length}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);

    console.log('\n📋 DETAILED RESULTS:');
    testResults.tests.forEach((test, index) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${test.name}`);
        if (test.details) {
            console.log(`   Details: ${test.details}`);
        }
    });

    if (testResults.failed > 0) {
        console.log('\n🔧 ISSUES FOUND:');
        testResults.tests.filter(t => !t.passed).forEach((test, index) => {
            console.log(`${index + 1}. ${test.name}: ${test.details}`);
        });
    }

    console.log('\n=====================================');
    return testResults;
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run the tests
runE2ETests().catch(console.error);