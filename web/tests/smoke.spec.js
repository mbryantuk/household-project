const { test, expect } = require('@playwright/test');

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
        // Navigate to Finance
        await page.click('a[href*="/finance"]');
        await page.waitForURL('**/finance**');

        // Check if Sidebar Accordion exists
        const accordion = page.locator('text=SWITCH PROFILE');
        await expect(accordion).toBeVisible();

        // Create a New Profile
        await page.click('button:has-text("Add")'); // Inside accordion
        await page.fill('input[placeholder*="e.g. Joint"]', 'Smoke Test Profile');
        await page.click('button:has-text("Create Profile")');

        // Verify it was created and selected
        await expect(page.locator('text=Smoke Test Profile')).toBeVisible();
        await expect(page).toHaveURL(/.*financial_profile_id=.*/);
    });

    test('Core Navigation: House Hub, Calendar, Meals', async ({ page }) => {
        await page.click('a[href*="/house"]');
        await expect(page.locator('h2')).toContainText('Household Hub');

        await page.click('a[href*="/calendar"]');
        await expect(page.locator('h2')).toContainText('Calendar');

        await page.click('a[href*="/meals"]');
        await expect(page.locator('h2')).toContainText('Meal Planner');
    });
});
