import { test, expect } from '@playwright/test';

test.describe('Onboarding Tour', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        // Ensure onboarding is NOT completed
        await page.addInitScript(() => {
            window.localStorage.removeItem('onboarding_completed');
        });
        
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
    });

    test('Tour starts automatically and can be progressed', async ({ page }) => {
        // Wait for tour to appear - use a more generic text search
        await expect(page.getByText('Welcome to Mantel!').first()).toBeVisible({ timeout: 15000 });

        // Click Next
        await page.click('button:has-text("Next")');
        await expect(page.getByText('Your Dashboard').first()).toBeVisible();

        // Skip the rest
        await page.click('button:has-text("Skip")');
        await expect(page.getByText('Welcome to Mantel!')).not.toBeVisible();
    });

    test('Restarting tour from settings', async ({ page }) => {
        // Complete the tour first
        await page.addInitScript(() => {
            window.localStorage.setItem('onboarding_completed', 'true');
        });
        await page.reload();
        
        await expect(page.getByText('Welcome to Mantel!')).not.toBeVisible();

        // Go to settings: First open the account panel
        await page.locator('button:has(.MuiAvatar-root)').last().click();
        // Use a more specific selector for the settings link in the sidebar panel
        await page.locator('.MuiListItemButton-root:has-text("Settings")').click();
        await page.waitForURL('**/settings**');
        
        // Find and click Restart Onboarding Tour
        const restartBtn = page.getByRole('button', { name: 'Restart Onboarding Tour' });
        await restartBtn.scrollIntoViewIfNeeded();
        await restartBtn.click();

        // Should reload and start tour on dashboard
        await page.waitForURL('**/dashboard');
        await expect(page.getByText('Welcome to Mantel!').first()).toBeVisible({ timeout: 15000 });
    });
});
