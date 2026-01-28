import { test, expect } from '@playwright/test';

test.describe('System Smoke & Comprehensive Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Smoke House ${uniqueId}`;

  test('Registration, Navigation, and CRUD Lifecycle', async ({ page }) => {
    // Enable Console Logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. REGISTRATION
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Smoke');
    await page.fill('input[name="lastName"]', 'Bot');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    console.log(`Attempting registration for ${email}`);
    await page.click('button[type="submit"]');

    // Wait for URL change to login page
    try {
        await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
        console.log('Registration successful, now on login page');
    } catch (e) {
        const errorText = await page.locator('.MuiAlert-root, [role="alert"]').innerText().catch(() => 'No visible error');
        console.error('Registration failed or timed out. Visible error:', errorText);
        throw e;
    }

    // 2. LOGIN
    console.log('Performing login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for dashboard or selection screen
    await page.waitForURL(/.*dashboard|.*select-household/, { timeout: 20000 });
    
    if (page.url().includes('/select-household')) {
        console.log('Landed on selection screen, choosing household...');
        await page.click(`text=${householdName}`);
        await page.waitForURL(/.*dashboard/, { timeout: 15000 });
    }

    // Verify Dashboard Content (More reliable than just URL)
    await expect(page.locator('text=Here\'s what\'s happening')).toBeVisible({ timeout: 15000 });
    
    const currentUrl = page.url();
    const hhMatch = currentUrl.match(/\/household\/(\d+)/);
    const hhId = hhMatch ? hhMatch[1] : null;
    console.log(`Dashboard loaded. Detected Household ID: ${hhId}`);

    if (!hhId) {
        throw new Error("Failed to detect household ID from URL: " + currentUrl);
    }

    // 3. NAVIGATION SMOKE TEST
    const routes = [
      { name: 'Calendar', path: `/household/${hhId}/calendar` },
      { name: 'People', path: `/household/${hhId}/people` },
      { name: 'Pets', path: `/household/${hhId}/pets` },
      { name: 'House', path: `/household/${hhId}/house` },
      { name: 'Vehicles', path: `/household/${hhId}/vehicles` },
      { name: 'Meals', path: `/household/${hhId}/meals` },
      { 
        name: 'Finance', 
        path: `/household/${hhId}/finance`,
        tabs: ['budget', 'income', 'banking', 'savings', 'invest', 'pensions', 'credit', 'loans', 'mortgage', 'car']
      },
      { name: 'Settings', path: `/household/${hhId}/settings` },
      { name: 'Profile', path: `/household/${hhId}/profile` }
    ];

    for (const route of routes) {
      console.log(`Checking route: ${route.path}`);
      await page.goto(route.path);
      await page.waitForLoadState('networkidle'); // Wait for network instead of hard timeout
      
      const body = page.locator('body');
      await expect(body).not.toContainText('Error');
      await expect(body).not.toContainText('404');
      
      // Basic content check to ensure we aren't on a blank page
      if (route.name !== 'Finance') { // Finance has complex tabs, checked below
          // Most pages have their name in the header or title
          // We check for some non-empty content to be safe
          await expect(page.locator('main, [role="main"]').last()).toBeVisible();
      }
      
      if (route.tabs) {
          for (const tab of route.tabs) {
              const tabUrl = `${route.path}?tab=${tab}`;
              console.log(`  Checking sub-tab: ${tabUrl}`);
              await page.goto(tabUrl);
              await page.waitForLoadState('networkidle');
              await expect(page.locator('body')).not.toContainText('Error');
              await expect(page.locator('body')).not.toContainText('404');
          }
      } else {
          await page.waitForLoadState('networkidle');
      }
    }
    console.log('All core routes verified');

    // 4. VEHICLE CRUD & REDIRECT TEST
    console.log('Testing Vehicle Creation & Redirect');
    await page.goto(`/household/${hhId}/vehicles`);
    
    // Wait for loader to disappear
    await expect(page.locator('.MuiCircularProgress-root')).not.toBeVisible({ timeout: 20000 });

    // Debug content
    const bodyText = await page.locator('body').innerText();
    console.log('DEBUG: Page Body Text:', bodyText);

    // Wait for Add Vehicle button (implies loaded and admin)
    // Using a more specific selector
    await expect(page.locator('button:has-text("Add Vehicle")')).toBeVisible({ timeout: 10000 });
    
    // Ensure we are on the list page
    await expect(page.locator('text=Vehicle Management')).toBeVisible();
    
    // Click Add
    await page.click('button:has-text("Add Vehicle")');
    await expect(page).toHaveURL(/.*vehicles\/new/);
    
    // Fill Form
    await page.fill('input[name="make"]', 'Tesla');
    await page.fill('input[name="model"]', 'Cybertruck');
    await page.fill('input[name="registration"]', 'SMOKE_TEST');
    
    console.log('Submitting new vehicle...');
    await page.click('button[type="submit"]');
    
    // VERIFY REDIRECT (The Fix)
    // Should redirect to /vehicles/{id} NOT /vehicles/vehicles/{id}
    await expect(page).toHaveURL(/\/vehicles\/\d+$/);
    await expect(page.locator('h2')).toContainText('Tesla Cybertruck');
    console.log('Vehicle creation redirect verified');

  });
});
