import { test, expect } from '@playwright/test';

test.describe('Core UI Smoke Tests', () => {
    const ADMIN_EMAIL = 'mbryantuk@gmail.com';
    const PASSWORD = 'Password123!';

    test.beforeEach(async ({ page }) => {
        // Attempt to disable any onboarding tours
        await page.addInitScript(() => {
            window.localStorage.setItem('mantel_tour_complete', 'true');
            window.localStorage.setItem('joyride_skipped', 'true');
        });
        await page.goto('/login');
        await page.fill('input[type="email"]', ADMIN_EMAIL);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', PASSWORD);
        await page.click('button:has-text("Log In")');
        await page.waitForURL('**/dashboard');
    });

    test('Financial Profiles: Sidebar Accordion and Switching', async ({ page }) => {
        // Navigate to Finance
        await page.getByRole('button', { name: 'Finance', exact: true }).click({ force: true });
        await page.waitForURL('**/finance**');

        // Check if Sidebar Accordion exists
        const accordion = page.locator('text=SWITCH PROFILE');
        await expect(accordion).toBeVisible();

        // Create a New Profile
        await page.click('button:has-text("Add")', { force: true }); // Inside accordion
        await page.fill('input[placeholder*="e.g. Joint"]', 'Smoke Test Profile');
        await page.click('button:has-text("Create Profile")', { force: true });

        // Verify it was created and selected
        await expect(page.locator('text=Smoke Test Profile')).toBeVisible();
        await expect(page).toHaveURL(/.*financial_profile_id=.*/);
    });

    test('Core Navigation: House Hub, Calendar, Meals', async ({ page }) => {
        await page.getByRole('button', { name: 'House', exact: true }).click({ force: true });
        await page.waitForURL('**/house**');
        await expect(page.locator('h2').filter({ hasText: 'Household Hub' })).toBeVisible();

        await page.getByRole('button', { name: 'Calendar', exact: true }).click({ force: true });
        await page.waitForURL('**/calendar**');
        await expect(page.locator('h2').filter({ hasText: 'Calendar' })).toBeVisible();

        await page.getByRole('button', { name: 'Meals', exact: true }).click({ force: true });
        await page.waitForURL('**/meals**');
        await expect(page.locator('h2').filter({ hasText: 'Meal Planner' })).toBeVisible();
    });

    test('Avatar Menu: Opens Sidebar Panel', async ({ page }) => {
        // Click Avatar (Footer)
        await page.locator('button:has(.MuiAvatar-root)').last().click({ force: true });
        
        // Verify Sidebar Panel content (Account Header)
        await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: '⚙️ Settings' })).toBeVisible();
        await expect(page.getByRole('button', { name: '👤 Profile' })).toBeVisible();
        await expect(page.getByText('Switch Household')).toBeVisible();
        await expect(page.getByText('Log Out')).toBeVisible();
    });

    test('Utility Bar: Persistent Widgets', async ({ page }) => {
        // Budget Health
        await page.locator('button[aria-label="Budget Health"]').click({ force: true });
        await expect(page.locator('text=Budget Health').first()).toBeVisible();
        await page.locator('button[aria-label="Budget Health"]').click({ force: true }); // Close

        // Wealth Tracking
        await page.locator('button[aria-label="Wealth Tracking"]').click({ force: true });
        await expect(page.locator('text=Wealth Tracking').first()).toBeVisible();
    });

    test('Settings View: Navigation and Tabs', async ({ page }) => {
        // Open Avatar Menu
        await page.locator('button:has(.MuiAvatar-root)').last().click({ force: true });
        
        // Click Settings
        await page.getByRole('button', { name: '⚙️ Settings' }).click({ force: true });
        await page.waitForURL('**/settings');
        
        // 1. Profile Tab (Default)
        await expect(page.getByLabel('First Name')).toBeVisible();
        await expect(page.getByLabel('Last Name')).toBeVisible();
        
        // 2. Appearance Tab
        await page.getByRole('tab', { name: 'Appearance' }).click({ force: true });
        await expect(page.getByText('Signature Designs')).toBeVisible();
        
        // 3. Security Tab
        await page.getByRole('tab', { name: 'Security' }).click({ force: true });
        await expect(page.getByText('Security Center')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Change Password' })).toBeVisible();
    });

    test('Profile Page: Direct Access and Theme Selector', async ({ page }) => {
        // Open Avatar Menu
        await page.locator('button:has(.MuiAvatar-root)').last().click({ force: true });
        
        // Click Profile
        await page.getByRole('button', { name: '👤 Profile' }).click({ force: true });
        await page.waitForURL('**/profile');

        await expect(page.locator('h2').filter({ hasText: 'Your Profile' })).toBeVisible();
        await expect(page.getByText('Appearance')).toBeVisible();
        await expect(page.getByText('Theme', { exact: true })).toBeVisible();
        
        // Toggle Edit
        await page.click('button:has-text("Edit Profile")', { force: true });
        await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    });
});
