import { test, expect } from '@playwright/test';

test.describe('School Term Tracking Smoke Test', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        
        // Wait for dashboard or household selector
        try {
            await page.waitForURL('**/dashboard', { timeout: 10000 });
        } catch {
            await page.waitForURL('**/select-household', { timeout: 10000 });
            await page.click('text=Brady Bunch');
            await page.waitForURL('**/dashboard', { timeout: 10000 });
        }
    });

    test('Navigate to child and check School Terms tab', async ({ page }) => {
        await page.click('a[href*="/people"]');
        await page.waitForURL('**/people');

        // Check if any child exists and click it
        // We look for common child names or just the text 'Child' from roles if visible
        // In seed, Peter is a child.
        await page.waitForSelector('text=Peter', { timeout: 5000 });
        await page.click('text=Peter');

        // Verify School Terms tab exists
        const schoolTab = page.locator('button:has-text("School Terms")');
        await expect(schoolTab).toBeVisible();
        await schoolTab.click();

        // Verify widget header
        await expect(page.locator('h2')).toContainText('School Terms');
    });
});
