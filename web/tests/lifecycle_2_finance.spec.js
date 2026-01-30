import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 2: Finance & Fringe', () => {
  let context;
  
  test.beforeAll(() => {
    const data = fs.readFileSync('/tmp/brady_context.json', 'utf8');
    context = JSON.parse(data);
  });

  test('Expand Brady Household', async ({ page }) => {
    test.setTimeout(400000);
    const { hhId, adminEmail, password } = context;

    page.on('console', msg => logStep('BROWSER', msg.text()));
    page.on('pageerror', err => logStep('BROWSER_ERROR', err.message));
    page.on('response', response => {
        if (response.status() >= 400) {
            logStep('API_ERROR', `${response.url()} returned ${response.status()}`);
        }
    });

    // Ensure we have enough space for the grid
    await page.setViewportSize({ width: 1280, height: 1000 });

    // Disable Service Worker
    await page.route('**/sw.js', route => route.abort());

    // Force is_test context
    await page.route('**/*', async route => {
        if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
            try {
                const postData = route.request().postDataJSON();
                if (postData && typeof postData === 'object') {
                    postData.is_test = 1;
                    await route.continue({ postData: JSON.stringify(postData) });
                    return;
                }
            } catch (e) {}
        }
        await route.continue();
    });

    await withTimeout('Admin Login', async () => {
        await page.goto('/login');
        await page.fill('input[type="email"]', adminEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`));
    });

    await withTimeout('Finance Setup', async () => {
        await page.goto(`/household/${hhId}/finance`);
        
        // 1. Add Bank Account
        logStep('Finance', 'Adding Bank Account');
        await page.click('text=Current Accounts');
        await page.click('button:has-text("Add Account")');
        await page.fill('input[name="bank_name"]', 'First National');
        await page.fill('input[name="account_name"]', 'Family Checking');
        await page.click('button:has-text("Save Account")');
        await expect(page.locator('text=Family Checking')).toBeVisible();

        // 2. Add Mike's Income
        logStep('Finance', "Adding Mike's Income");
        await page.goto(`/household/${hhId}/finance`);
        await page.click('text=Income Sources');
        await page.click('button:has-text("Add Income")');
        await page.fill('input[name="employer"]', 'Architectural Assoc');
        await page.fill('input[name="amount"]', '8500');
        await page.fill('input[name="payment_day"]', '1');
        await page.click('button:has-text("Save Income")');
        await expect(page.locator('text=Architectural Assoc')).toBeVisible();

        // 3. Add Savings Account (Regression Test)
        logStep('Finance', 'Adding Savings Account');
        await page.goto(`/household/${hhId}/finance?tab=savings`);
        await page.click('button:has-text("Add Savings Account")');
        await page.fill('input[name="institution"]', 'Chase');
        await page.fill('input[name="account_name"]', 'Rainy Day');
        await page.fill('input[name="current_balance"]', '1000');
        await page.click('button:has-text("Save Account")');
        await expect(page.locator('text=Rainy Day')).toBeVisible();
    });

    await withTimeout('Fringe Data - Calendar & Birthdays', async () => {
        await page.goto(`/household/${hhId}/calendar`);
        
        // 1. Add General Event
        logStep('Fringe Data', 'Adding Family Picnic event');
        await page.click('button:has-text("New Event")');
        await page.fill('input[name="title"]', 'Family Picnic');
        await page.fill('input[name="date"]', '2026-06-15');
        await page.click('button:has-text("Save")');
        await expect(page.locator('text=Family Picnic')).toBeVisible({ timeout: 15000 });

        // 2. Add Birthday Event via Calendar App
        logStep('Fringe Data', "Adding Alice's Birthday via Calendar");
        await page.click('button:has-text("New Event")');
        await page.fill('input[name="title"]', "Alice's 45th Birthday");
        
        // Set Type to Birthday using standard locator
        await page.getByLabel('Type').click();
        await page.locator('li[role="option"]:has-text("Birthday")').click();
        
        await page.fill('input[name="date"]', '2026-05-10');
        await page.click('button:has-text("Save")');
        
        await expect(page.locator('text=Alice\'s 45th Birthday')).toBeVisible({ timeout: 15000 });
        logStep('Fringe Data', 'Birthday event created successfully');
    }, 120000);

    await withTimeout('Budget Verification', async () => {
        await page.goto(`/household/${hhId}/finance`);
        await page.click('text=Monthly Budget');
        await expect(page.locator('text=Safe to Spend')).toBeVisible();
        logStep('Budget', 'Budget matrix verified with income.');
    });
  });
});
