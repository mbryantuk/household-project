import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 3: Expense Allocation', () => {
  let context;
  
  test.beforeAll(() => {
    try {
        const data = fs.readFileSync('/tmp/brady_context.json', 'utf8');
        context = JSON.parse(data);
    } catch {
        console.warn("Context file not found, using defaults for dev testing if applicable.");
        context = { hhId: '1', adminEmail: 'mbryantuk@gmail.com', password: 'password' };
    }
  });

  test('Create & Verify Expenses (Household, Personal, Vehicle)', async ({ page }) => {
    test.setTimeout(300000);
    const { hhId, adminEmail, password } = context;
    
    // 1. Login
    await logStep('Login', 'Authenticating...');
    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`));

    // 2. Navigate to Budget
    await logStep('Navigation', 'Going to Budget View...');
    await page.goto(`/household/${hhId}/finance?tab=budget`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h2', { hasText: 'Budget' })).toBeVisible({ timeout: 15000 });

    // --- Helper: Add Expense ---
    const addRecurringExpense = async (entityLabel, category, name, amount) => {
        const stepName = `Add Expense: ${name}`;
        await logStep(stepName, 'Opening Modal...');
        
        // Open Add Menu -> Add Recurring
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Add Recurring' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // 1. Select Entity (Assign To)
        await logStep(stepName, `Selecting Entity: ${entityLabel}`);
        // Locate the Select trigger by the label "Assign To"
        const assignLabel = page.locator('label', { hasText: 'Assign To' });
        // The trigger is a button inside the sibling div or directly following
        // Joy UI structure: FormControl -> Label -> Select (div+button)
        await assignLabel.locator('..').getByRole('button').click();
        // Click the option
        await page.getByRole('option', { name: entityLabel, exact: false }).first().click();

        // 2. Select Category
        await logStep(stepName, `Selecting Category: ${category}`);
        const catLabel = page.locator('label', { hasText: 'Category' });
        await catLabel.locator('..').getByRole('button').click();
        await page.getByRole('option', { name: category, exact: false }).first().click();

        // 3. Fill Details
        await page.fill('input[name="name"]', name);
        await page.fill('input[name="amount"]', amount.toString());
        
        // 4. Save
        await page.getByRole('button', { name: 'Add Recurring Expense' }).click();
        
        // 5. Verify Success
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.locator('div[role="alert"]')).toContainText(/added/i);
    };

    // --- EXECUTION ---

    // A. Household Expense
    await withTimeout('Expense: Household', async () => {
        await addRecurringExpense('Household (General)', 'Utility', 'Electric Bill', 150);
        // Verify it appears in "Household" section
        // We look for the row "Electric Bill" and ensure it's visible. 
        // Ideally we'd check if it's under the "Household" accordion, but visual check is hard.
        // We can check if the row exists.
        await expect(page.locator('tr', { hasText: 'Electric Bill' })).toBeVisible();
        // Verify Category Pill
        await expect(page.locator('tr', { hasText: 'Electric Bill' }).locator('span', { hasText: 'utility' })).toBeVisible();
    });

    // B. Personal Expense (Mike)
    await withTimeout('Expense: Personal', async () => {
        // Assuming "Mike Brady" exists. If not, try "Mike".
        // The context doesn't explicitly store member names, but standard seed is Mike Brady.
        await addRecurringExpense('Mike', 'Subscription', 'Architecture Weekly', 25);
        await expect(page.locator('tr', { hasText: 'Architecture Weekly' })).toBeVisible();
    });

    // C. Vehicle Expense (Kingswood)
    await withTimeout('Expense: Vehicle', async () => {
        // Assuming "Kingswood" exists.
        await addRecurringExpense('Kingswood', 'Fuel', 'Monthly Fuel', 200);
        await expect(page.locator('tr', { hasText: 'Monthly Fuel' })).toBeVisible();
    });

    // D. Verify Grouping Headers (Visual Check mostly, but we can search for text)
    await logStep('Verify', 'Checking Section Headers...');
    // "Financial Obligations (Household)" should be visible
    await expect(page.locator('div', { hasText: 'Financial Obligations (Household)' }).first()).toBeVisible();
    
    // "Mike Brady" section should exist (if logic works)
    await expect(page.locator('div').filter({ hasText: /Mike/ }).first()).toBeVisible();

    // "Kingswood" section should exist
    await expect(page.locator('div').filter({ hasText: /Kingswood/ }).first()).toBeVisible();

    await logStep('Success', 'All expenses created and verified.');
  });
});
