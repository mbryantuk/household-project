import { test, expect } from '@playwright/test';

test.describe('Frontend Smoke Test', () => {
  const uniqueId = Date.now();
  const email = `smoke_${uniqueId}@test.com`;
  const password = 'Password123!';

  test('should register, login and navigate all core pages', async ({ page }) => {
    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Smoke');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="householdName"]', 'Smoke Household');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or login
    await expect(page).toHaveURL(/.*dashboard|.*login/);

    // 2. Login (if not auto-logged in or to be sure)
    if (page.url().includes('/login')) {
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
    }

    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h2')).toContainText('Dashboard');

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
      // Find the link in the sidebar or navigate directly
      // Navigating directly is more robust for a "smoke test" of the component
      await page.goto(route.path);
      
      // Basic "it didn't crash" check
      const body = page.locator('body');
      await expect(body).not.toContainText('Error');
      await expect(body).not.toContainText('404');
      
      // Ensure specific headers or markers exist for some pages
      if (route.name === 'Finance') {
          await expect(page.locator('h2')).toContainText('Finance');
      }
    }
  });
});
