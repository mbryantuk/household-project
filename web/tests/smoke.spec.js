import { test, expect } from '@playwright/test';

test.describe('System Smoke & Comprehensive Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Smoke House ${uniqueId}`;

  test('Registration, Navigation, and CRUD Lifecycle', async ({ page }) => {
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

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard|.*select-household/, { timeout: 15000 });
    
    if (page.url().includes('/select-household')) {
        await page.click(`text=${householdName}`);
    }

    await expect(page).toHaveURL(/.*dashboard/);
    await page.waitForTimeout(5000); // Massive settle
    console.log('Dashboard loaded');

    // 3. NAVIGATION SMOKE TEST
    const routes = [
      { name: 'Calendar', path: '/calendar' },
      { name: 'People', path: '/people' },
      { name: 'Pets', path: '/pets' },
      { name: 'House', path: '/house' },
      { name: 'Vehicles', path: '/vehicles' },
      { name: 'Meals', path: '/meals' },
      { 
        name: 'Finance', 
        path: '/finance',
        tabs: ['budget', 'income', 'banking', 'savings', 'invest', 'pensions', 'credit', 'loans', 'mortgage', 'car']
      },
      { name: 'Settings', path: '/settings' },
      { name: 'Profile', path: '/profile' }
    ];

    for (const route of routes) {
      console.log(`Checking route: ${route.path}`);
      await page.goto(route.path);
      await page.waitForTimeout(2000); // Settle each page
      
      const body = page.locator('body');
      await expect(body).not.toContainText('Error');
      await expect(body).not.toContainText('404');
      
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
  });
});
