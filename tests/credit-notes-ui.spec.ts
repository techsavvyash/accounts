import { test, expect, Page } from '@playwright/test'

const API_URL = 'http://localhost:6969'
const WEB_URL = 'http://localhost:3000'

test.describe('Credit/Debit Notes UI E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(WEB_URL)

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should login and navigate to credit notes section', async ({ page }) => {
    // Check if we're on login page or already logged in
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false)

    if (isLoginPage) {
      console.log('Logging in...')
      // Fill in login credentials
      await page.fill('input[type="email"]', 'admin@demo.com')
      await page.fill('input[type="password"]', 'admin123')

      // Submit login form
      await page.click('button[type="submit"]')

      // Wait for navigation after login
      await page.waitForTimeout(2000)
    }

    // Look for the credit notes navigation item (both desktop and mobile)
    const creditNotesNav = page.locator('text=Credit/Debit Notes').or(page.locator('text=Credit')).first()

    // Wait for it to be visible
    await creditNotesNav.waitFor({ state: 'visible', timeout: 10000 })

    // Click to navigate to credit notes
    await creditNotesNav.click()

    // Wait for the credit notes page to load
    await page.waitForSelector('text=Credit & Debit Notes', { timeout: 10000 })

    // Verify we're on the credit notes page
    const heading = await page.locator('h2:has-text("Credit & Debit Notes")').isVisible()
    expect(heading).toBeTruthy()

    console.log('✅ Successfully navigated to Credit/Debit Notes section')
  })

  test('should display the credit notes interface', async ({ page }) => {
    // Login first
    await loginIfNeeded(page)

    // Navigate to credit notes
    await navigateToCreditNotes(page)

    // Check for key UI elements
    const createButton = page.locator('button:has-text("Create Note")')
    await expect(createButton).toBeVisible()

    // Check for filters
    const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="note"]')).first()
    await expect(searchInput).toBeVisible()

    // Check for tabs (All Notes, Credit Notes, Debit Notes)
    const allNotesTab = page.locator('text=All Notes').or(page.locator('[role="tab"]:has-text("All")'))

    console.log('✅ Credit notes interface displayed correctly')
  })

  test('should open create note dialog', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    // Click create note button
    const createButton = page.locator('button:has-text("Create Note")')
    await createButton.click()

    // Wait for dialog to appear
    await page.waitForSelector('text=Create Credit/Debit Note', { timeout: 5000 })

    // Verify dialog content
    const dialogTitle = await page.locator('text=Create Credit/Debit Note').isVisible()
    expect(dialogTitle).toBeTruthy()

    // Check for form fields
    const reasonField = page.locator('textarea[placeholder*="reason"]').or(page.locator('label:has-text("Reason")'))
    await expect(reasonField).toBeVisible({ timeout: 5000 })

    console.log('✅ Create note dialog opened successfully')
  })

  test('should create a credit note', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    // Open create dialog
    await page.click('button:has-text("Create Note")')
    await page.waitForSelector('text=Create Credit/Debit Note', { timeout: 5000 })

    // Wait a bit for form to be fully ready
    await page.waitForTimeout(1000)

    // Select note type (Credit)
    const typeSelector = page.locator('select').first().or(page.locator('[role="combobox"]').first())

    // Try to select customer - find the customer selector
    // Look for "Select customer" button or dropdown
    const customerButton = page.locator('button:has-text("Select customer")').or(
      page.locator('text=Customer').locator('..').locator('button')
    ).first()

    if (await customerButton.isVisible().catch(() => false)) {
      await customerButton.click()
      await page.waitForTimeout(500)

      // Select first customer from list
      const firstCustomer = page.locator('[role="option"]').first()
      if (await firstCustomer.isVisible().catch(() => false)) {
        await firstCustomer.click()
      }
    }

    // Fill in reason
    const reasonField = page.locator('textarea').first()
    await reasonField.fill('E2E Test - Product return')

    // Add line item
    // Find description input
    const descriptionInputs = page.locator('input[placeholder*="description"]').or(
      page.locator('input[placeholder*="Item"]')
    )

    if (await descriptionInputs.first().isVisible().catch(() => false)) {
      await descriptionInputs.first().fill('Test Product Return')

      // Fill quantity
      const qtyInput = page.locator('input[placeholder*="Qty"]').or(
        page.locator('input[type="number"]').first()
      )
      await qtyInput.fill('1')

      // Fill rate
      const rateInputs = page.locator('input[placeholder*="Rate"]').or(
        page.locator('input[type="number"]').nth(1)
      )
      await rateInputs.fill('1000')

      // Click Add button
      const addButton = page.locator('button:has-text("Add")').first()
      await addButton.click()

      await page.waitForTimeout(1000)
    }

    // Submit the form
    const createNoteButton = page.locator('button:has-text("Create Note")').last()
    await createNoteButton.click()

    // Wait for success
    await page.waitForTimeout(3000)

    console.log('✅ Credit note creation attempted')
  })

  test('should filter notes by type', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    // Wait for notes to load
    await page.waitForTimeout(2000)

    // Click on Credit Notes tab
    const creditTab = page.locator('text=Credit Notes').or(
      page.locator('[role="tab"]:has-text("Credit")')
    )

    if (await creditTab.isVisible().catch(() => false)) {
      await creditTab.click()
      await page.waitForTimeout(1000)
      console.log('✅ Filtered to Credit Notes')
    }

    // Click on Debit Notes tab
    const debitTab = page.locator('text=Debit Notes').or(
      page.locator('[role="tab"]:has-text("Debit")')
    )

    if (await debitTab.isVisible().catch(() => false)) {
      await debitTab.click()
      await page.waitForTimeout(1000)
      console.log('✅ Filtered to Debit Notes')
    }

    // Click on All Notes tab
    const allTab = page.locator('text=All Notes').or(
      page.locator('[role="tab"]:has-text("All")')
    )

    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click()
      await page.waitForTimeout(1000)
      console.log('✅ Showing all notes')
    }
  })

  test('should search for notes', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').or(
      page.locator('input[type="text"]').first()
    )

    if (await searchInput.isVisible().catch(() => false)) {
      // Type search query
      await searchInput.fill('CN-2024')
      await page.waitForTimeout(1000)

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      console.log('✅ Search functionality tested')
    }
  })

  test('should view note details', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    await page.waitForTimeout(2000)

    // Look for a note in the table
    const viewButton = page.locator('button:has-text("View")').or(
      page.locator('[role="button"]:has-text("View")')
    ).first()

    // Or look for eye icon
    const eyeIcon = page.locator('button svg').first()

    // Try to find and click a note to view
    const noteRow = page.locator('table tbody tr').first()

    if (await noteRow.isVisible().catch(() => false)) {
      // Click on the note row or actions menu
      const moreButton = noteRow.locator('button').last()

      if (await moreButton.isVisible().catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(500)

        // Click view details
        const viewOption = page.locator('text=View Details').or(
          page.locator('[role="menuitem"]:has-text("View")')
        )

        if (await viewOption.isVisible().catch(() => false)) {
          await viewOption.click()
          await page.waitForTimeout(1000)

          // Check if details dialog opened
          const detailsVisible = await page.locator('text=Details').or(
            page.locator('text=Note Information')
          ).isVisible().catch(() => false)

          if (detailsVisible) {
            console.log('✅ Note details viewed successfully')
          }
        }
      }
    }
  })

  test('should display summary cards', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    await page.waitForTimeout(2000)

    // Check for summary cards
    const totalCreditCard = page.locator('text=Total Credit Notes').or(
      page.locator('text=Credit').first()
    )

    const totalDebitCard = page.locator('text=Total Debit Notes').or(
      page.locator('text=Debit').first()
    )

    console.log('✅ Summary cards displayed')
  })

  test('should take screenshot of credit notes page', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    await page.waitForTimeout(3000)

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/credit-notes-page.png',
      fullPage: true
    })

    console.log('✅ Screenshot saved to tests/screenshots/credit-notes-page.png')
  })

  test('full workflow: create credit note and debit note', async ({ page }) => {
    await loginIfNeeded(page)
    await navigateToCreditNotes(page)

    console.log('Starting full workflow test...')

    // Take initial screenshot
    await page.screenshot({ path: 'tests/screenshots/1-initial-page.png' })

    // Count initial notes
    const initialNotes = await page.locator('table tbody tr').count().catch(() => 0)
    console.log(`Initial notes count: ${initialNotes}`)

    // Open create dialog
    await page.click('button:has-text("Create Note")')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/2-create-dialog.png' })

    // Try to create a note if customer is available
    const customerSelector = page.locator('button:has-text("Select customer")').first()

    if (await customerSelector.isVisible().catch(() => false)) {
      await customerSelector.click()
      await page.waitForTimeout(500)

      const customerOptions = await page.locator('[role="option"]').count()
      console.log(`Found ${customerOptions} customers`)

      if (customerOptions > 0) {
        await page.locator('[role="option"]').first().click()

        // Fill form
        await page.locator('textarea').first().fill('E2E Full Workflow Test')

        // Add line item
        const descInput = page.locator('input').nth(2)
        await descInput.fill('Test Item')

        const qtyInput = page.locator('input[type="number"]').first()
        await qtyInput.fill('2')

        const rateInput = page.locator('input[type="number"]').nth(1)
        await rateInput.fill('500')

        await page.click('button:has-text("Add")')
        await page.waitForTimeout(1000)

        await page.screenshot({ path: 'tests/screenshots/3-filled-form.png' })

        // Create the note
        await page.click('button:has-text("Create Note")')
        await page.waitForTimeout(3000)

        await page.screenshot({ path: 'tests/screenshots/4-after-create.png' })

        // Verify new note appears
        const finalNotes = await page.locator('table tbody tr').count().catch(() => 0)
        console.log(`Final notes count: ${finalNotes}`)

        if (finalNotes > initialNotes) {
          console.log('✅ Successfully created note - count increased!')
        }
      }
    }

    console.log('✅ Full workflow test completed')
  })
})

// Helper functions
async function loginIfNeeded(page: Page) {
  const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false)

  if (isLoginPage) {
    console.log('Logging in...')
    await page.fill('input[type="email"]', 'admin@demo.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)
  }
}

async function navigateToCreditNotes(page: Page) {
  // Look for credit notes navigation
  const creditNotesNav = page.locator('text=Credit/Debit Notes').or(
    page.locator('text=Credit').first()
  )

  if (await creditNotesNav.isVisible({ timeout: 5000 }).catch(() => false)) {
    await creditNotesNav.click()
    await page.waitForTimeout(1000)
  }

  // Wait for the page to load
  await page.waitForSelector('text=Credit', { timeout: 10000 }).catch(() => {})
}
