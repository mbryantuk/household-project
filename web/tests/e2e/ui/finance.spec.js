import { test, expect } from '@playwright/test';
import { createTestUserAndHousehold } from '../../utils/e2e_setup';

test.describe('UI Flow: Finance', () => {
    let creds;

    test.beforeAll(async ({ request }) => {
        creds = await createTestUserAndHousehold(request, 'finance');
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', creds.email);
        await page.click('button:has-text("Next")');
        await page.fill('input[type="password"]', creds.password);
        await page.click('button:has-text("Log In")');
        await page.waitForURL(/\/dashboard/);
    });

    test('User can add a recurring cost', async ({ page }) => {
        await page.getByRole('link', { name: 'House' }).click();
        await page.click(`text=${creds.householdName}`);
        await page.click('button:has-text("Bills & Costs")');

        await page.click('button:has-text("Add Cost")');
        
        await page.fill('input[name="name"]', 'Internet Bill');
        await page.fill('input[name="amount"]', '50');
        await page.fill('input[name="day_of_month"]', '15');

        await page.click('button:has-text("Save")');
        
        await expect(page.getByText('Internet Bill')).toBeVisible();
        await expect(page.getByText('£50')).toBeVisible();
    });
});
