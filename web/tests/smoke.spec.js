import { test, expect } from '@playwright/test';

test.describe('Frontend Smoke Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';

  test('should register, login and navigate all core pages', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Smoke');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', 'Smoke Household');
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

    // Give the backend a moment to finish initialization before logging in
    await page.waitForTimeout(2000);

    // 2. Login
    console.log('Performing login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for dashboard or selector
    await expect(page).toHaveURL(/.*dashboard|.*select-household/, { timeout: 15000 });
    
    if (page.url().includes('/select-household')) {
        console.log('On selector page, picking first household');
        await page.click('text=Smoke Household');
    }

    await expect(page).toHaveURL(/.*dashboard/);
    // dashboard greeting check
    await expect(page.locator('h2')).toContainText(/Good (morning|afternoon|evening), Smoke/);

    // 3. Navigate through core pages
    const routes = [
      { name: 'Calendar', path: '/calendar' },
      { name: 'People', path: '/people' },
      { name: 'Pets', path: '/pets' },
      { name: 'House', path: '/house' },
      { name: 'Vehicles', path: '/vehicles' },
      { name: 'Meals', path: '/meals' },
      { name: 'Finance', path: '/finance' },
      { name: 'Settings', path: '/settings' },
      { name: 'Profile', path: '/profile' }
    ];

    for (const route of routes) {
      console.log(`Checking route: ${route.path}`);
      await page.goto(route.path);
      
      // Basic "it didn't crash" check
      const body = page.locator('body');
      await expect(body).not.toContainText('Error');
      await expect(body).not.toContainText('404');
      
      // Wait for network to settle to ensure data fetch attempt
      await page.waitForLoadState('networkidle');
    }
  });
});
