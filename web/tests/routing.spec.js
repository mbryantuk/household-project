import { test, expect } from '@playwright/test';

test.describe('Breadth-First Routing Smoke Test', () => {
  const uniqueId = Date.now();
  const email = `routing_${uniqueId}@test.com`;
  const password = 'Password123!';
  const householdName = `Route Test House ${uniqueId}`;

  test('Module Availability Check', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Force test mode for registration
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
    
    await page.waitForURL(/.*login/);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/);

    const url = page.url();
    let hhId = url.split('/household/')[1].split('/')[0];

    console.log('Checking basic availability...');
    
    // Check Dashboard
    await expect(page.locator('body')).toContainText('today', { timeout: 15000 });
    
    // Check Calendar
    await page.goto(`/household/${hhId}/calendar`);
    await expect(page.locator('body')).toContainText('Calendar', { timeout: 15000 });
    
    // Check Settings
    await page.goto(`/household/${hhId}/settings`);
    await expect(page.locator('body')).toContainText('Settings', { timeout: 15000 });
    
    console.log('✅ Basic routing verification passed.');
  });
});
