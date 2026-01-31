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

  test('Create Savings Pots vs Accounts, Allocate in Budget, Verify Balance Update', async ({ page }) => {
    test.setTimeout(180000);
    const { hhId, adminEmail, password } = context;
    
    // 1. Login
    await logStep('Login', 'Authenticating...');
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`), { waitUntil: 'domcontentloaded' });

    // 2. Setup Savings Accounts
    await logStep('Navigation', 'Going to Savings View...');
    await page.goto(`/household/${hhId}/finance?tab=savings`, { waitUntil: 'domcontentloaded' });
    
    // Create Account 1: "Rainy Day" (Will have a Pot)
    await page.getByRole('button', { name: 'Add Savings' }).click();
    await page.fill('input[name="institution"]', 'Chase');
    await page.fill('input[name="account_name"]', 'Rainy Day');
    await page.fill('input[name="current_balance"]', '5000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('div[role="alert"]')).toContainText(/added/i);
    
    // Create Account 2: "Emergency Fund" (Will NOT have a Pot)
    await page.getByRole('button', { name: 'Add Savings' }).click();
    await page.fill('input[name="institution"]', 'Barclays');
    await page.fill('input[name="account_name"]', 'Emergency Fund');
    await page.fill('input[name="current_balance"]', '2000');
    // Ensure we set a deposit amount so it shows in budget? 
    // The logic uses `deposit_amount > 0`.
    await page.fill('input[name="deposit_amount"]', '100'); 
    await page.fill('input[name="deposit_day"]', '1');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('div[role="alert"]')).toContainText(/added/i);

    // 3. Add Pot to "Rainy Day"
    // Find card for Rainy Day
    const rainyCard = page.locator('div').filter({ hasText: 'Rainy Day' }).last(); 
    await rainyCard.getByRole('button', { name: /Add Pot|Create Pot/i }).click();
    await page.fill('input[name="name"]', 'Holiday Fund');
    await page.fill('input[name="target_amount"]', '1000');
    await page.fill('input[name="deposit_day"]', '1');
    await page.fill('input[name="current_amount"]', '0'); 
    await page.getByRole('button', { name: /Save|Create/i }).click();
    await expect(page.locator('div[role="alert"]')).toContainText(/added/i);

    // 4. Verify in Budget
    await logStep('Budget', 'Verifying Visibility in Budget...');
    await page.goto(`/household/${hhId}/finance?tab=budget`, { waitUntil: 'domcontentloaded' });
    
    await expect(page.locator('div', { hasText: 'Savings & Growth' }).first()).toBeVisible();
    
    // Rule: Pots show. Accounts WITHOUT pots show. Accounts WITH pots hide.
    
    // "Holiday Fund" (Pot) -> Should be VISIBLE
    await expect(page.locator('tr', { hasText: 'Holiday Fund' })).toBeVisible();
    
    // "Emergency Fund" (Account No Pots) -> Should be VISIBLE
    await expect(page.locator('tr', { hasText: 'Emergency Fund' })).toBeVisible();
    
    // "Rainy Day" (Account With Pots) -> Should be HIDDEN (to avoid double counting with Pot)
    await expect(page.locator('tr', { hasText: 'Rainy Day' })).not.toBeVisible();

    // 5. Pay the Pot
    await logStep('Budget', 'Marking Pot as Paid...');
    const potRow = page.locator('tr', { hasText: 'Holiday Fund' });
    const amountInput = potRow.locator('input[type="number"]');
    await amountInput.fill('50');
    await amountInput.blur(); 
    
    const checkbox = potRow.locator('input[type="checkbox"]').nth(1); 
    await checkbox.check(); 
    await page.waitForTimeout(1000); 

    // 6. Verify Balance Update
    await logStep('Verification', 'Checking Savings Balance...');
    await page.goto(`/household/${hhId}/finance?tab=savings`, { waitUntil: 'domcontentloaded' });
    
    // Rainy Day should be 5000 + 50 = 5050
    // Pot should be 50
    await expect(page.locator('div').filter({ hasText: 'Rainy Day' }).filter({ hasText: '£5,050.00' })).toBeVisible();
    await expect(page.locator('div').filter({ hasText: 'Holiday Fund' }).filter({ hasText: '£50.00' })).toBeVisible();

    await logStep('Success', 'Pot automation and visibility rules verified.');
  });
});
