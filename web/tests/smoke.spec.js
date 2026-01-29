import { test, expect } from '@playwright/test';

test.describe('System Smoke & Comprehensive Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Mega House ${uniqueId}`;

  test('Full System Lifecycle and Route Accessibility', async ({ page }) => {
    test.setTimeout(480000); // 8 minutes for deep coverage

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Force is_test to true for registration
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    // 1. REGISTRATION & LOGIN
    console.log(`Step 1: Registering ${email}`);
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Lead');
    await page.fill('input[name="lastName"]', 'Architect');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/, { timeout: 30000 });

    console.log('Step 2: Logging in');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 30000 });
    
    const url = page.url();
    const hhId = url.match(/\/household\/(\d+)/)[1];
    console.log(`Step 3: Dashboard loaded. Household ID: ${hhId}`);

    // ==========================================
    // ROUTE ACCESSIBILITY CHECK
    // ==========================================
    const routes = [
        { path: 'dashboard', text: 'today' },
        { path: 'calendar', text: 'Calendar' },
        { path: 'house', text: 'Household Hub' },
        { path: 'meals', text: 'Meal Planner' },
        { path: 'finance', text: 'Financial Matrix' },
        { path: 'settings', text: 'Settings' },
        { path: 'profile', text: 'Profile' }
    ];

    for (const route of routes) {
        console.log(`Checking Route: ${route.path}`);
        await page.goto(`/household/${hhId}/${route.path}`);
        await expect(page.locator('body')).toContainText(route.text, { timeout: 15000 });
    }

    // ==========================================
    // 4. HOUSEHOLD HUB ACTIONS (Residents & Fleet)
    // ==========================================
    console.log('Step 4: Household Hub - Creating Residents');
    await page.goto(`/household/${hhId}/house`);
    await expect(page.locator('h2:has-text("Household Hub")')).toBeVisible();

    // Add Adult
    await page.click('button:has-text("Add Adult")');
    await page.fill('input[name="first_name"]', 'John');
    await page.fill('input[name="last_name"]', 'Doe');
    await page.click('button:has-text("Create Person")');
    
    // Add Vehicle
    await page.goto(`/household/${hhId}/house`);
    await page.click('button:has-text("Add Vehicle")');
    await page.fill('input[name="make"]', 'Tesla');
    await page.fill('input[name="model"]', 'Model 3');
    await page.fill('input[name="registration"]', 'EL22 TEN');
    await page.click('button:has-text("Create Vehicle")');
    
    // Verify visibility in Hub
    await page.goto(`/household/${hhId}/house`);
    await expect(page.locator('text=John')).toBeVisible();
    await expect(page.locator('text=Tesla Model 3')).toBeVisible();

    // ==========================================
    // 5. FINANCE MATRIX ACTIONS
    // ==========================================
    console.log('Step 5: Finance Matrix Verification');
    await page.goto(`/household/${hhId}/finance`);
    console.log('   - Waiting for Financial Matrix header');
    await expect(page.locator('h2:has-text("Financial Matrix")')).toBeVisible();

    // 5.1 Add Bank Account (Required for Income)
    console.log('   - Adding Bank Account');
    await page.click('text=Current Accounts');
    await page.click('button:has-text("Add Account")');
    await page.fill('input[name="bank_name"]', 'HSBC');
    await page.fill('input[name="account_name"]', 'Joint Checking');
    await page.click('button:has-text("Save Account")');
    console.log('   - Waiting for Joint Checking to appear');
    await expect(page.locator('text=Joint Checking')).toBeVisible();

    // 5.2 Add Primary Income (Required for Budget)
    console.log('   - Adding Primary Income');
    await page.goto(`/household/${hhId}/finance`);
    await page.click('text=Income Sources');
    await page.click('button:has-text("Add Income")');
    await page.fill('input[name="employer"]', 'Tech Corp');
    await page.fill('input[name="amount"]', '3500');
    await page.fill('input[name="payment_day"]', '25');
    console.log('   - Selecting John Doe');
    await page.click('label:has-text("Assigned Person") + div button');
    await page.click('li[role="option"]:has-text("John")');
    await page.check('input[name="is_primary"]');
    console.log('   - Saving Income');
    await page.click('button:has-text("Save Income")');
    console.log('   - Waiting for Tech Corp to appear');
    await expect(page.locator('text=Tech Corp').first()).toBeVisible();

    // 5.3 Verify Monthly Budget
    console.log('   - Verifying Monthly Budget');
    await page.goto(`/household/${hhId}/finance`);
    await page.click('text=Monthly Budget');
    console.log('   - Waiting for Budget header');
    await expect(page.locator('h2:has-text("Budget")')).toBeVisible();
    console.log('   - Waiting for Safe to Spend');
    await expect(page.locator('text=Safe to Spend')).toBeVisible();

    console.log('Step 6: Final System Verification Summary');
    console.log('   ✅ All Primary Routes Accessible');
    console.log('   ✅ Household Hub Integration Verified');
    console.log('   ✅ Financial Matrix Integration Verified');
  });
});
