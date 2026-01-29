import { test, expect } from '@playwright/test';

test.describe('Breadth-First Routing Smoke Test', () => {
  const uniqueId = Date.now();
  const email = `routing_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Simple House ${uniqueId}`;

  test('Module Availability Check', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Register
    await page.route('**/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();
        postData.is_test = 1; 
        await route.continue({ postData });
    });

    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Router');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*login/, { timeout: 30000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 30000 });

    const url = page.url();
    let hhId = url.split('/household/')[1].split('/')[0];

    const checks = [
        { path: 'dashboard', text: 'today' },
        { path: 'calendar', text: 'Calendar' },
        { path: 'house', text: 'Household Hub' },
        { path: 'finance', text: 'Financial Matrix' },
        { path: 'settings', text: 'Settings' }
    ];

    for (const check of checks) {
        console.log(`Checking: ${check.path}`);
        await page.goto(`/household/${hhId}/${check.path}`);
        // Use a broader text search on the body to be more resilient to UI tweaks
        await expect(page.locator('body')).toContainText(check.text, { timeout: 15000 });
    }
    
    console.log('✅ Basic routing verification passed.');
  });
});
