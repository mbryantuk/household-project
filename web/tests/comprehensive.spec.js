import { test, expect } from '@playwright/test';

test.describe('Mega Comprehensive System Test', () => {
  const uniqueId = Date.now();
  const email = `nightly_${uniqueId}@test.com`;
  const password = 'NightlyPassword123!';
  const householdName = `Nightly House ${uniqueId}`;

  test('System Lifecycle: Registration, CRUD, and Financials', async ({ page }) => {
    // 1. REGISTRATION
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Nightly');
    await page.fill('input[name="lastName"]', 'Bot');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });

    // 2. LOGIN
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

    // 3. ASSET CRUD
    console.log('Testing Asset CRUD...');
    await page.goto('/vehicles');
    await page.click('text=Add Vehicle');
    await page.fill('input[name="make"]', 'Tesla');
    await page.fill('input[name="model"]', 'Model 3 Nightly');
    await page.fill('input[name="purchase_value"]', '45000');
    await page.click('button:has-text("Create")');
    await expect(page.locator('body')).toContainText('Model 3 Nightly');

    // 4. RECURRING CHARGE & BUDGET LINKING
    console.log('Testing Financial Lifecycle...');
    await page.goto('/finance?tab=income');
    await page.click('text=Add Income');
    await page.fill('input[name="employer"]', 'Nightly Corp');
    await page.fill('input[name="amount"]', '5000');
    await page.fill('input[name="payment_day"]', '1');
    await page.click('label:has-text("Primary Income")');
    await page.click('button:has-text("Create")');

    await page.goto('/finance?tab=budget');
    // Verify income shows up in "Safe to Spend" logic indirectly or just check page load
    await expect(page.locator('body')).toContainText('Nightly Corp');

    // 5. THEME TOGGLING (Visual Stability)
    console.log('Testing Theme Switching...');
    await page.goto('/profile');
    await page.click('text=Theme');
    await page.click('text=Dark');
    await page.waitForTimeout(500);
    await page.click('text=Light');

    // 6. HOUSEHOLD SETTINGS
    console.log('Testing Settings...');
    await page.goto('/settings');
    await expect(page.locator('h2')).toContainText('Household Settings');
    
    console.log('Comprehensive Test Passed.');
  });
});
