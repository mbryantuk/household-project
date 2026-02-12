import { test, expect } from '@playwright/test';
import { createTestUserAndHousehold } from '../../utils/e2e_setup';

test.describe('UI Flow: Assets', () => {
    let creds;

    test.beforeAll(async ({ request }) => {
        creds = await createTestUserAndHousehold(request, 'assets');
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', creds.email);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', creds.password);
        await page.click('button:has-text("Log In")');
        await page.waitForURL(/\/dashboard/);
    });

    test('User can add a new asset', async ({ page }) => {
        await page.getByRole('link', { name: 'House' }).click();
        await page.click(`text=${creds.householdName}`);
        await page.click('button:has-text("Assets")');
        
        await page.click('button:has-text("Add Asset")');
        await expect(page.locator('#asset-form')).toBeVisible();

        await page.fill('input[name="name"]', 'Office Laptop');
        await page.fill('input[name="location"]', 'Office');
        await page.fill('input[name="purchase_value"]', '1500');

        // Handle Category Select (MUI) if needed, or default
        // Just verify basic creation for now

        await page.click('button[type="submit"][form="asset-form"]');
        
        await expect(page.getByText('Office Laptop')).toBeVisible();
    });
});
