import { test, expect } from '@playwright/test';

test.describe('UI Flow: Onboarding', () => {
    test('User can register and configure household details', async ({ page }) => {
        const RUN_ID = Date.now();
        const EMAIL = `onboard.${RUN_ID}@test.com`;
        const PASSWORD = 'Password123!';
        const HOUSE_NAME = `Onboard House ${RUN_ID}`;

        // 1. Register
        await test.step('Register', async () => {
            await page.goto('/register');
            await page.fill('input[name="householdName"]', HOUSE_NAME);
            await page.fill('input[name="firstName"]', 'New');
            await page.fill('input[name="lastName"]', 'User');
            await page.fill('input[name="email"]', EMAIL);
            await page.fill('input[name="password"]', PASSWORD);
            await page.fill('input[name="confirmPassword"]', PASSWORD);
            await page.click('button[type="submit"]');
            
            await expect(page).toHaveURL(/\/login/);
            await expect(page.getByText('Registration successful')).toBeVisible();
        });

        // 2. Login
        await test.step('Login', async () => {
            await page.fill('input[type="email"]', EMAIL);
            await page.click('button:has-text("Next")');
            await expect(page.getByText('Welcome back')).toBeVisible();
            await page.fill('input[type="password"]', PASSWORD);
            await page.click('button:has-text("Log In")');
            await expect(page).toHaveURL(/\/household\/\d+\/dashboard/);
        });

        // 3. Configure House Details
        await test.step('Configure House', async () => {
            await page.click('a[href*="/house"]');
            await expect(page.locator('h2').filter({ hasText: 'Household Hub' })).toBeVisible();
            await page.click(`text=${HOUSE_NAME}`);
            
            await page.click('button:has-text("General Details")');
            await page.fill('input[name="property_type"]', 'Detached');
            await page.fill('input[name="construction_year"]', '2000');
            await page.click('button:has-text("Save")');
            await expect(page.getByText('updated')).toBeVisible();
        });
    });
});
