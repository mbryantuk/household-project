import { test, expect } from '@playwright/test';

test.describe('Core UI Smoke Tests', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
        await expect(page.getByRole('link', { name: 'House' })).toBeVisible({ timeout: 10000 });
    });

    test('Financial Profiles: Sidebar Accordion and Switching', async ({ page }) => {
        // Navigate to Finance
        await page.getByRole('link', { name: 'Finance' }).click();
        await page.waitForURL('**/finance**');

        // Check if Sidebar Accordion exists
        const accordion = page.locator('text=PROFILES');
        await expect(accordion).toBeVisible();

        // Create a New Profile
        await page.click('button[aria-label="Add Profile"]'); // Inside accordion
        await page.fill('input[placeholder*="e.g. Side Hustle"]', 'Smoke Test Profile');
        await page.click('button:has-text("Create")');

        // Verify it was created and selected
        await expect(page.locator('button[role="combobox"]').filter({ hasText: 'Smoke Test Profile' })).toBeVisible();
        await expect(page).toHaveURL(/.*financial_profile_id=.*/);
    });

    test('Core Navigation: House Hub, Meals', async ({ page }) => {
        await page.getByRole('link', { name: 'House' }).click();
        // The header contains either 'House Hub' or the Household Name
        await expect(page.getByText(/House Hub|Brady/)).toBeVisible();

        await page.getByRole('link', { name: 'Meals' }).click();
        await expect(page.getByText('Meal Planner').first()).toBeVisible();
    });

    test('Core Navigation: Property Details', async ({ page }) => {
        await page.getByRole('link', { name: 'House' }).click();
        const link = page.locator('text=Property Details');
        await expect(link).toBeVisible({ timeout: 10000 });
        await link.click();
        
        await expect(page.getByText('Property Identity')).toBeVisible();
        await expect(page.getByText('Property Type')).toBeVisible();
        
        // Check tabs
        await page.click('text=Technical & Utilities');
        await expect(page.getByText('Technical & Utilities').first()).toBeVisible();
        await expect(page.getByText('Broadband Provider')).toBeVisible();
        
        await page.click('text=Recurring Costs');
        await expect(page.getByText('Household Recurring Costs')).toBeVisible();
    });

    test('Groceries: Add Item and Budget Estimate', async ({ page }) => {
        const hhId = await page.evaluate(() => localStorage.getItem('last_household_id'));
        await page.goto(`/household/${hhId}/shopping`);
        await expect(page.getByText('Groceries').first()).toBeVisible();

        // Add Item
        await page.fill('input[placeholder="Item name (e.g. Milk)"]', 'Playwright Milk');
        await page.fill('input[placeholder="£ Est."]', '1.50');
        await page.click('button:has-text("Add")');

        // Verify List
        await expect(page.locator('text=Playwright Milk')).toBeVisible();

        // Verify Budget Widget (using first() to avoid strict mode violation with item price)
        const total = page.locator('text=£1.50').first();
        await expect(total).toBeVisible();
    });

    test('Avatar Menu: Opens Sidebar Panel', async ({ page }) => {
        // Click Avatar (Footer/Rail)
        await page.getByLabel('Account').click();
        
        // Verify Sidebar Panel content (Account Header)
        await expect(page.getByText('Profile Settings', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Household Settings')).toBeVisible();
        await expect(page.getByText('Switch Household')).toBeVisible();
        await expect(page.getByText('Log Out')).toBeVisible();
    });

    test('Utility Bar: Persistent Widgets', async ({ page }) => {
        // Budget Health
        await page.locator('button[aria-label="Budget Health"]').click();
        await expect(page.locator('p').getByText('Budget Health')).toBeVisible();
        await page.locator('button[aria-label="Budget Health"]').click(); // Close

        // Wealth Tracking
        await page.locator('button[aria-label="Wealth Tracking"]').click();
        await expect(page.locator('p').getByText('Wealth Tracking')).toBeVisible();
    });

    test('Admin: System Administration & Tenant Export UI', async ({ page }) => {
        // Navigate to Settings
        await page.locator('button[aria-label="Account"]').click();
        const settingsLink = page.locator('text=Household Settings');
        await expect(settingsLink).toBeVisible({ timeout: 10000 });
        await settingsLink.click();
        await page.waitForURL('**/settings**');

        // Check for Admin Tools tab
        const adminTab = page.locator('text=Admin Tools');
        await expect(adminTab).toBeVisible();
        await adminTab.click();

        await expect(page.locator('text=System Administration')).toBeVisible();
        await expect(page.locator('text=Tenant Registry')).toBeVisible();
        
        // Verify Export button exists for at least one tenant
        const exportButton = page.locator('button[aria-label="Export Tenant Data"]').first();
        await expect(exportButton).toBeVisible();
    });

    test('Settings: Theme Customization', async ({ page }) => {
        // Navigate to Settings > Appearance
        await page.locator('button[aria-label="Account"]').click();
        const settingsLink = page.locator('text=Settings');
        await expect(settingsLink).toBeVisible({ timeout: 10000 });
        await settingsLink.click();
        await page.waitForURL('**/settings**');
        
        const appearanceTab = page.locator('text=Appearance');
        await expect(appearanceTab).toBeVisible();
        await appearanceTab.click();
        
        // Verify Theme Grid renders
        await expect(page.locator('text=Signature Designs')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Light Themes')).toBeVisible();
        await expect(page.locator('text=Dark Themes')).toBeVisible();

        // Select a theme (e.g., Mantel Obsidian)
        await page.click('text=Mantel Obsidian');
        
        // Verify selection (usually indicated by solid variant or Palette icon)
        // Since we can't easily check 'solid' variant via text, we check for Laboratory/Custom
        await page.click('text=Custom Theme');
        await expect(page.locator('text=Custom Theme Builder')).toBeVisible();
    });
});
