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
        await page.getByRole('link', { name: 'Finance' }).click();
        await page.waitForURL('**/finance**');

        // Click on Monthly Budget card
        await page.click('text=Monthly Budget');
        
        // Open Add menu
        await page.getByRole('button', { name: 'Add' }).click();
        await page.click('text=Add Recurring Expense');

        await page.fill('input[name="name"]', 'Internet Bill');
        await page.fill('input[name="amount"]', '50');

        await page.click('button:has-text("Save Recurring")');
        
        await expect(page.getByText('Internet Bill')).toBeVisible();
    });
});
