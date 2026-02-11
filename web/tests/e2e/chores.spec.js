import { test, expect } from '@playwright/test';

test.describe('Chores & Gamification Flow', () => {
  const EMAIL = "mbryantuk@gmail.com";
  const PASSWORD = "Password123!";

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));

    await page.goto('/login');
    await page.fill('input[type="email"]', EMAIL);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', PASSWORD);
    await page.click('button:has-text("Log In")');
    
    await Promise.race([
        page.waitForURL(/\/dashboard/),
        page.waitForSelector('text=Select Household')
    ]);

    if (await page.getByText('Select Household').isVisible()) {
        console.log("Selecting 'The Brady Bunch' household...");
        await page.locator('div[role="button"]').filter({ hasText: 'The Brady Bunch' }).first().click();
    }
    
    await page.waitForURL(/\/dashboard/);
    console.log("Dashboard loaded.");
  });

  test('should view, add, complete, and delete a chore', async ({ page }) => {
    // 1. Navigate to Chores
    await page.getByText('Chores').first().click();
    await page.waitForURL(/\/chores/);
    await expect(page.locator('h2', { hasText: 'Chores Tracker' })).toBeVisible();

    // 2. Verify Seeded Data
    await expect(page.getByText('Mow the Lawn')).toBeVisible();
    
    // 3. Add Chore
    await page.click('button:has-text("Add Chore")');
    const modal = page.getByRole('dialog', { name: 'Add New Chore' });
    await expect(modal).toBeVisible();

    const taskName = `Test Chore ${Date.now()}`;
    await page.fill('input[name="name"]', taskName);
    
    // Set to One-off
    // Click the Select trigger inside the modal
    await modal.getByText('Weekly').click();
    
    // Select Option (Global)
    await page.getByRole('option', { name: 'One-off' }).click();

    await page.fill('input[type="number"]', '5.00'); 
    
    // 4. Submit
    await page.click('button:has-text("Create Task")');

    // 5. Verify Creation
    const newRow = page.locator('tr', { hasText: taskName });
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText('£5.00');
    await expect(newRow).toContainText('One-off');

    // 6. Complete
    await newRow.locator('button').first().click();

    // 7. Verify Row Gone
    await expect(page.locator('tr', { hasText: taskName })).not.toBeVisible();
  });
});
