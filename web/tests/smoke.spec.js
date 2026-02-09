import { test, expect } from '@playwright/test';

test.describe('Core UI Smoke Tests', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    let householdId;

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard', { waitUntil: 'networkidle' });
        
        const url = page.url();
        console.log('Post-login URL:', url);
        const match = url.match(/\/household\/(\d+)\/dashboard/);
        householdId = match ? match[1] : null;
        console.log('Extracted householdId:', householdId);

        // Wait for dashboard to fully load
        await expect(page.locator('text=Budget Health').first()).toBeVisible();
    });

    test('Financial Profiles: Sidebar Accordion and Switching', async ({ page }) => {
        // Navigate to Finance page
        await page.goto(`/household/${householdId}/finance?tab=budget`, { waitUntil: 'networkidle' });
        
        // Ensure the side panel is open
        const financeRail = page.locator('text=Finance').first();
        await financeRail.hover();
        await financeRail.click(); // Click to ensure it stays open

        // Check if Sidebar Profiles exists
        const profilesHeader = page.locator('text=PROFILES').first();
        await expect(profilesHeader).toBeVisible();

        // Create a New Profile
        await page.locator('button[aria-label="Add Profile"]').first().click(); 
        const nameInput = page.locator('input[placeholder*="e.g. Side Hustle"]');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('Smoke Test Profile');
        await page.click('button:has-text("Create")');

        // Verify it was created and selected
        await expect(page.locator('text=Smoke Test Profile').first()).toBeVisible();
        await expect(page).toHaveURL(/.*financial_profile_id=.*/);
    });

    test('Core Navigation: House Hub, Calendar, Meals', async ({ page }) => {
        await page.goto(`/household/${householdId}/house`, { waitUntil: 'networkidle' });
        await expect(page.locator('text=Residents').first()).toBeVisible();

        await page.goto(`/household/${householdId}/calendar`, { waitUntil: 'networkidle' });
        await expect(page.locator('h2').filter({ hasText: 'Calendar' })).toBeVisible();

        await page.goto(`/household/${householdId}/meals`, { waitUntil: 'networkidle' });
        await expect(page.locator('h2').filter({ hasText: 'Meal Planner' })).toBeVisible();
    });

    test('Finance: Budget Categories and Emojis', async ({ page }) => {
        await page.goto(`/household/${householdId}/finance?tab=categories`);
        await expect(page.locator('h2').filter({ hasText: 'Budget Categories' })).toBeVisible();

        // Add a category
        await page.click('button:has-text("Add Category")');
        await page.fill('input[placeholder*="e.g. Groceries"]', 'Smoke Test Category');
        await page.fill('input[placeholder*="No limit"]', '100');
        await page.click('button:has-text("Save Category")');

        // Verify it exists
        await expect(page.locator('text=Smoke Test Category').first()).toBeVisible();
    });

    test('Avatar Menu: Opens Sidebar Panel', async ({ page }) => {
        // Click Avatar (Footer)
        await page.locator('button:has(.MuiAvatar-root)').last().click();
        
        // Verify Sidebar Panel content (Account Header)
        await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
        await expect(page.locator('text=Settings').first()).toBeVisible();
        await expect(page.locator('text=Switch Household').first()).toBeVisible();
        await expect(page.locator('text=Log Out').first()).toBeVisible();
    });

    test('Utility Bar: Persistent Widgets', async ({ page }) => {
        // Budget Health
        await page.locator('button[aria-label="Budget Health"]').click();
        await expect(page.locator('p:has-text("Budget Health")').first()).toBeVisible();
        await page.locator('button[aria-label="Budget Health"]').click(); // Close

        // Wealth Tracking
        await page.locator('button[aria-label="Wealth Tracking"]').click();
        await expect(page.locator('p:has-text("Wealth Tracking")').first()).toBeVisible();
    });
});
