import { test, expect } from '@playwright/test';
import { createTestUserAndHousehold } from '../../utils/e2e_setup';

test.describe('UI Flow: Members', () => {
    let creds;

    test.beforeAll(async ({ request }) => {
        creds = await createTestUserAndHousehold(request, 'members');
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', creds.email);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', creds.password);
        await page.click('button:has-text("Log In")');
        await page.waitForURL(/\/dashboard/);
    });

    test('User can add a new member', async ({ page }) => {
        await page.getByRole('link', { name: 'House' }).click();
        await expect(page.getByText('People & Residents')).toBeVisible();

        // Add Member
        await page.getByRole('button', { name: 'Add Adult' }).first().click();
        
        await page.fill('input[name="first_name"]', 'John');
        await page.fill('input[name="last_name"]', 'Doe');
        await page.fill('input[name="dob"]', '1990-01-01');
        
        await page.click('button:has-text("Create Person")');

        await expect(page).toHaveURL(/\/house/);
        await expect(page.getByText('John')).toBeVisible();
    });
});
