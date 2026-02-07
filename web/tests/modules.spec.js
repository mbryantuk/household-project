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
    await page.waitForLoadState('networkidle');
    
    // Wait for settings section
    await expect(page.getByText('Feature Modules')).toBeVisible({ timeout: 15000 });

    // Try to find ANY checkbox in the modules section
    // The modules section is a Sheet. 
    const vehicleSwitch = page.locator('input[type="checkbox"]').nth(1);

    // Open Household Panel in sidebar
    await page.getByText('House', { exact: true }).first().click();

    // Ensure it is ON to start
    await vehicleSwitch.waitFor({ state: 'visible' });
    const isInitiallyChecked = await vehicleSwitch.isChecked();
    if (!isInitiallyChecked) {
        await vehicleSwitch.click();
        await expect(vehicleSwitch).toBeChecked();
    }
    
    // Check for FLEET header
    const fleetHeader = page.locator('text=FLEET');
    await expect(fleetHeader).toBeVisible();

    // Turn OFF
    await vehicleSwitch.click();
    await expect(vehicleSwitch).not.toBeChecked();
    await expect(fleetHeader).toBeHidden();

    // Turn ON
    await vehicleSwitch.click();
    await expect(vehicleSwitch).toBeChecked();
    await expect(fleetHeader).toBeVisible();
  });
});
