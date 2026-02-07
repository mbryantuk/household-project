import { test, expect } from '@playwright/test';

test.describe('Module Configuration', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('should toggle Vehicles/Fleet module', async ({ page }) => {
    // 1. Navigate to Settings using the sidebar or direct URL.
    // We assume household 1 exists and user has access.
    await page.goto('/household/1/settings');
    
    // Wait for settings to load
    await expect(page.getByText('Feature Modules')).toBeVisible();

    // Locators
    const fleetHeader = page.getByText('FLEET', { exact: true });
    // The switch for vehicles. The text in the box is "Vehicles" (capitalized by css? no, manually capitalized in map key? 'pets', 'vehicles' are strings).
    // In code: <Typography ... textTransform="capitalize">{mod}</Typography>
    // So visual text is "Vehicles".
    const vehicleRow = page.locator('div').filter({ hasText: /^VehiclesEnable or disable vehicles tracking.$/ });
    const vehicleSwitch = vehicleRow.getByRole('checkbox');

    // 2. Initial State Check
    // We want to ensure it is ON to start testing the "Turn Off" flow.
    const isInitiallyChecked = await vehicleSwitch.isChecked();
    if (!isInitiallyChecked) {
        await vehicleSwitch.click();
        await expect(vehicleSwitch).toBeChecked();
        // Wait for sidebar to update
        await expect(fleetHeader).toBeVisible();
    } else {
        await expect(fleetHeader).toBeVisible();
    }

    // 3. Turn OFF
    await vehicleSwitch.click();
    await expect(vehicleSwitch).not.toBeChecked();
    await expect(fleetHeader).toBeHidden();

    // 4. Turn ON
    await vehicleSwitch.click();
    await expect(vehicleSwitch).toBeChecked();
    await expect(fleetHeader).toBeVisible();
  });
});
