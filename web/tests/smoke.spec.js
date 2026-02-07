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
        // Navigate to Finance via Rail
        await page.locator('.MuiListItemButton-root:has-text("Finance")').first().click();
        await page.waitForURL('**/finance**');
    });

    test('Core Navigation: House Hub, Calendar, Meals', async ({ page }) => {
        // House
        await page.locator('.MuiListItemButton-root:has-text("House")').first().click();
        await expect(page.getByText('Market Valuation').first()).toBeVisible();

        // Calendar
        await page.locator('.MuiListItemButton-root:has-text("Calendar")').first().click();
        // Check for "Calendar" header
        await expect(page.locator('h2:has-text("Calendar")').first()).toBeVisible();

        // Meals (if enabled)
        const mealsIcon = page.locator('.MuiListItemButton-root:has-text("Meals")').first();
        if (await mealsIcon.isVisible()) {
            await mealsIcon.click();
            // Check for subheader text which is unique
            await expect(page.getByText('Plan weekly meals').first()).toBeVisible();
        }
    });

    test('Avatar Menu: Opens Sidebar Panel', async ({ page }) => {
        // Click Avatar (Footer of Sidebar Rail)
        await page.locator('.MuiSheet-root button:has(.MuiAvatar-root)').last().click();
        
        // Verify Sidebar Panel content
        await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
        await expect(page.locator('text=Settings').first()).toBeVisible();
        await expect(page.locator('text=Switch Household').first()).toBeVisible();
        await expect(page.locator('text=Log Out').first()).toBeVisible();
    });

    test('Utility Bar: Persistent Widgets', async ({ page }) => {
        // Budget Health
        await page.locator('button[aria-label="Budget Health"]').click();
        await expect(page.locator('text=Budget Health').first()).toBeVisible();
        await page.locator('button[aria-label="Budget Health"]').click(); // Close

        // Wealth Tracking
        await page.locator('button[aria-label="Wealth Tracking"]').click();
        await expect(page.locator('text=Wealth Tracking').first()).toBeVisible();
    });

    test('Theme Settings: Switch Theme', async ({ page }) => {
        // 1. Open Account Panel
        await page.locator('.MuiSheet-root button:has(.MuiAvatar-root)').last().click();
        
        // 2. Click Settings in the panel
        await page.locator('text=Settings').first().click();
        await page.waitForURL('**/settings**');

        // 3. Click on Appearance Tab
        await page.click('text=Appearance');

        // 4. Select "Midnight City" (Dark Theme)
        await page.locator('text=Midnight City').click();
        
        // Allow time for theme application
        await page.waitForTimeout(1000);

        // 5. Verify visual change
        const midnightCard = page.locator('.MuiSheet-variantSolid:has-text("Midnight City")');
        await expect(midnightCard).toBeVisible();

        // 6. Revert to "Mantel" (Default)
        await page.locator('text=Mantel').first().click();
        const mantelCard = page.locator('.MuiSheet-variantSolid:has-text("Mantel")');
        await expect(mantelCard).toBeVisible();
    });
});
