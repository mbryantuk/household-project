import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 2b: Dual-Income Drawdown Verification', () => {
  let context;
  
  test.beforeAll(() => {
    try {
        const data = fs.readFileSync('/tmp/brady_context.json', 'utf8');
        context = JSON.parse(data);
    } catch (e) {
        // Fallback for direct execution
        context = { hhId: '1', adminEmail: 'mbryantuk@gmail.com', password: 'Password123!' };
    }
  });

  test('Verify Drawdown Projection with Dual Income', async ({ page }) => {
    test.setTimeout(60000);
    const { hhId, adminEmail, password } = context;

    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`));

    // Navigate to Budget
    await page.goto(`/household/${hhId}/finance?tab=budget`);
    
    // 1. Verify Income Section exists and contains multiple incomes
    await logStep('Verify Incomes', 'Checking for Income section...');
    await expect(page.locator('text=Incomes')).toBeVisible();
    
    const incomeItems = page.locator('tr:has-text("Pay")');
    const count = await incomeItems.count();
    console.log(`Found ${count} income items.`);
    // We expect at least Mike and Carol
    expect(count).toBeGreaterThanOrEqual(2);

    // 2. Verify Projection Card
    await logStep('Verify Projection', 'Checking for Drawdown Projection card...');
    await expect(page.locator('text=Drawdown Projection')).toBeVisible();
    await expect(page.locator('text=Lowest Point')).toBeVisible();
    await expect(page.locator('text=Safe to Spend Now')).toBeVisible();

    // 3. Verify the Chart
    await logStep('Verify Chart', 'Checking for SVG projection chart...');
    const chart = page.locator('svg').filter({ has: page.locator('polyline') });
    await expect(chart).toBeVisible();

    // 4. Verify today marker or text
    await expect(page.locator('text=Today')).toBeVisible();

    // 5. Check if "Safe to Spend" is a positive value (assuming seed data state)
    const safeToSpendText = await page.locator('text=Safe to Spend Now').locator('xpath=following-sibling::*').textContent();
    console.log(`Safe to Spend: ${safeToSpendText}`);
    // Note: It might be £0.00 if overdrawn, but should be a currency format
    expect(safeToSpendText).toMatch(/£[0-9,.]+/);
  });
});
