import { test, expect } from '@playwright/test';

test.setTimeout(120000); // 2 minutes

test.describe('Module Configuration', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
        await page.waitForLoadState('networkidle');
    });

  test('should toggle Vehicles/Fleet module', async ({ page }) => {
    // Navigate to Settings - Household tab is index 2
    const url = page.url();
    const householdId = url.split('/household/')[1].split('/')[0];
    await page.goto(`/household/${householdId}/settings?tab=2`);
    
    // Wait for the specific settings content
    await expect(page.getByText(/Feature Modules/i)).toBeVisible({ timeout: 20000 });

    // Open Household Panel in sidebar
    await page.getByText(/House/i).first().click();
    
    // Check for FLEET header in sidebar
    const fleetHeader = page.locator('nav, aside').getByText('Fleet', { exact: true });

    // Find the toggle for Vehicles specifically
    const vehicleSwitch = page.locator('div').filter({ has: page.getByText('Enable or disable vehicles tracking.', { exact: true }) }).locator('input').first();

    // Ensure it is ON to start
    const isInitiallyChecked = await vehicleSwitch.isChecked();
    if (!isInitiallyChecked) {
        await vehicleSwitch.click({ force: true });
        await page.waitForTimeout(1000);
    }
    
    // Ensure FLEET is visible in sidebar
    await expect(fleetHeader).toBeVisible();

    // Turn OFF
    await vehicleSwitch.click({ force: true });
    // Wait for sidebar update
    await expect(fleetHeader).toBeHidden({ timeout: 10000 });

    // Turn ON
    await vehicleSwitch.click({ force: true });
    await expect(fleetHeader).toBeVisible({ timeout: 10000 });
  });
});