import { test, expect } from '@playwright/test';

test.describe('Core UI Smoke Tests', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
    });

    test('Financial Profiles: Sidebar Accordion and Switching', async ({ page }) => {
        await page.getByRole('button', { name: 'Finance' }).click();
        await page.waitForURL('**/finance**');

        const accordion = page.locator('text=SWITCH PROFILE');
        await expect(accordion).toBeVisible();

        await page.click('button:has-text("Add")');
        await page.fill('input[placeholder*="e.g. Joint"]', 'Smoke Test Profile');
        await page.click('button:has-text("Create Profile")');

        await expect(page.locator('text=Smoke Test Profile')).toBeVisible();
        await expect(page).toHaveURL(/.*financial_profile_id=.*/);
    });

    test('Budget Tracker: Renders New Layout and Integrated Tray', async ({ page }) => {
        await page.getByRole('button', { name: 'Finance' }).click();
        await page.waitForURL('**/finance**');
        
        // Check for new Summary Row items
        await expect(page.locator('text=Liquidity')).toBeVisible();
        await expect(page.locator('text=Income')).toBeVisible();
        await expect(page.locator('text=Disposable')).toBeVisible();

        // Check for control bar buttons
        await expect(page.getByRole('button', { name: 'Projection' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Wealth' })).toBeVisible();
        
        // Test tray expansion
        await page.getByRole('button', { name: 'Projection' }).click();
        await expect(page.locator('text=Drawdown Projection')).toBeVisible();
        
        // Close tray
        await page.getByRole('button', { name: 'Projection' }).click();
        await expect(page.locator('text=Drawdown Projection')).not.toBeVisible();
    });

    test('Core Navigation: House Hub, Calendar, Meals', async ({ page }) => {
        await page.getByRole('button', { name: 'House' }).click();
        await expect(page.locator('h2')).toContainText('Household Hub');

        await page.getByRole('button', { name: 'Calendar' }).click();
        await expect(page.locator('h2')).toContainText('Calendar');

        await page.getByRole('button', { name: 'Meals' }).click();
        await expect(page.locator('h2')).toContainText('Meal Planner');
    });

    test('Avatar Menu: Opens Sidebar Panel', async ({ page }) => {
        // Click Avatar (Footer)
        await page.getByRole('button', { name: 'Account & Settings' }).click();
        
        await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
        // The menu item for settings has name "⚙️ Settings" usually
        await expect(page.getByRole('button', { name: /Settings/i }).nth(1)).toBeVisible();
        await expect(page.getByText('Switch Household')).toBeVisible();
        await expect(page.getByText('Log Out')).toBeVisible();
    });
});
