import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 4: Savings Pots & Budget Integration', () => {
  let context;
  
  test.beforeAll(() => {
    try {
        const data = fs.readFileSync('/tmp/brady_context.json', 'utf8');
        context = JSON.parse(data);
    } catch (e) {
        console.warn("Context file not found, using defaults for dev testing if applicable.");
        context = { hhId: '1', adminEmail: 'mbryantuk@gmail.com', password: 'password' };
    }
  });

  test('Create Savings Pot, Allocate in Budget, Verify Balance Update', async ({ page }) => {
    test.setTimeout(120000);
    const { hhId, adminEmail, password } = context;
    
    // 1. Login
    await logStep('Login', 'Authenticating...');
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`), { waitUntil: 'domcontentloaded' });

    // 2. Setup Savings Account (if needed) - Assuming "Rainy Day" from previous test exists, but robustly checking
    // We will navigate to Savings tab to add a Pot
    await logStep('Navigation', 'Going to Savings View...');
    await page.goto(`/household/${hhId}/finance?tab=savings`, { waitUntil: 'domcontentloaded' });
    
    await page.getByRole('button', { name: 'Add Savings' }).click();
    await page.fill('input[name="institution"]', 'Monzo');
    await page.fill('input[name="account_name"]', 'Pot Test Account');
    await page.fill('input[name="current_balance"]', '1000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('div[role="alert"]')).toContainText(/added/i);
    
    // Now add a Pot to "Pot Test Account"
    await page.locator('div').filter({ hasText: 'Pot Test Account' }).getByRole('button', { name: /Add Pot|Create Pot/i }).click();
    await page.fill('input[name="name"]', 'Holiday Fund');
    await page.fill('input[name="target_amount"]', '500');
    await page.fill('input[name="deposit_day"]', '1');
    await page.fill('input[name="current_amount"]', '0'); // Start empty
    await page.getByRole('button', { name: /Save|Create/i }).click();
    await expect(page.locator('div[role="alert"]')).toContainText(/added/i);

    // 4. Verify in Budget
    await logStep('Budget', 'Verifying Pot in Budget...');
    await page.goto(`/household/${hhId}/finance?tab=budget`, { waitUntil: 'domcontentloaded' });
    
    // Check "Savings & Growth" section
    await expect(page.locator('div', { hasText: 'Savings & Growth' }).first()).toBeVisible();
    const potRow = page.locator('tr', { hasText: 'Holiday Fund' });
    await expect(potRow).toBeVisible();
    
    // 5. Pay the Pot
    await logStep('Budget', 'Marking Pot as Paid...');
    const amountInput = potRow.locator('input[type="number"]');
    await amountInput.fill('50');
    await amountInput.blur(); // Trigger save
    
    // Click Checkbox
    const checkbox = potRow.locator('input[type="checkbox"]').nth(1); // 0 is Select, 1 is Paid
    await checkbox.check(); 
    await page.waitForTimeout(1000); // Wait for API

    // 6. Verify Balance Update
    await logStep('Verification', 'Checking Savings Balance...');
    await page.goto(`/household/${hhId}/finance?tab=savings`, { waitUntil: 'domcontentloaded' });
    
    await expect(page.locator('div').filter({ hasText: 'Pot Test Account' }).filter({ hasText: '£1,050.00' })).toBeVisible();
    await expect(page.locator('div').filter({ hasText: 'Holiday Fund' }).filter({ hasText: '£50.00' })).toBeVisible();

    await logStep('Success', 'Pot automation verified.');
  });
});