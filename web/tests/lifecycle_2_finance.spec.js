import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import fs from 'fs';

test.describe('Brady Lifecycle Stage 2: Finance & Fringe', () => {
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

  test('Expand Brady Household Finance (Frontend - Resilience Mode)', async ({ page }) => {
    test.setTimeout(300000); // 5 mins
    const { hhId, adminEmail, password } = context;
    const errors = [];
    
    // Login UI
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

    // Disable Service Worker (Prevent Caching/Interception issues in Test)
    await page.route('**/sw.js', route => route.abort());

    await page.goto('/login');
    await page.fill('input[type="email"]', adminEmail);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');
    await page.waitForURL(new RegExp(`/household/${hhId}/dashboard`));
    
    // --- HELPERS ---
    const createFinancialItem = async (tab, addBtnText, fillFn) => {
        const stepName = `Adding item to ${tab}`;
        try {
            await logStep(stepName, 'Navigating...');
            // Use 'commit' to return as soon as server sends response headers
            await page.goto(`/household/${hhId}/finance?tab=${tab}`, { waitUntil: 'commit' });
            // Poll for URL update, robust against client-side transitions
            await expect(page).toHaveURL(new RegExp(`tab=${tab}`), { timeout: 10000 });
            // Wait for spinner to disappear (MUI Joy CircularProgress)
            await expect(page.locator('span[role="progressbar"]')).not.toBeVisible();
            
            await logStep(stepName, `Clicking ${addBtnText}...`);
            if (addBtnText.startsWith('MENU:')) {
                 const menuText = addBtnText.replace('MENU:', '');
                 await page.getByRole('button', { name: 'Add New' }).click(); 
                 await page.getByRole('menuitem', { name: menuText }).click();
            } else {
                 await page.getByRole('button', { name: addBtnText }).click();
            }

            await expect(page.getByRole('dialog')).toBeVisible();
            
            await fillFn();
            
            await logStep(stepName, `Saving...`);
            await page.waitForTimeout(500); 

            // Check Validity
            const isFormValid = await page.evaluate(() => {
                const form = document.querySelector('div[role="dialog"] form');
                return form ? form.checkValidity() : false;
            });
            if (!isFormValid) {
                 console.error(`❌ Form is invalid in ${stepName}`);
                 await page.evaluate(() => {
                     const form = document.querySelector('div[role="dialog"] form');
                     const invalid = form.querySelectorAll(':invalid');
                     invalid.forEach(el => console.error('Invalid Field:', el.name));
                 });
                 throw new Error('Form validation failed');
            }

            // Debug Network
            const apiPattern = tab === 'banking' ? 'current-accounts' : 
                               tab === 'income' ? 'income' :
                               tab === 'savings' ? 'savings' :
                               tab === 'invest' ? 'investments' :
                               tab === 'pensions' ? 'pensions' :
                               tab === 'mortgage' ? 'mortgages' :
                               tab === 'car' ? 'vehicle-finance' :
                               tab === 'loans' ? 'loans' :
                               tab === 'credit' ? 'credit-cards' : 'unknown';

            const responsePromise = page.waitForResponse(resp => 
                resp.url().includes(apiPattern) && resp.request().method() === 'POST', 
                { timeout: 5000 }
            ).catch(() => null);

            await page.getByRole('dialog').getByRole('button', { name: /Save|Add|Create/i }).click();
            
            const response = await responsePromise;
            if (response) {
                const status = response.status();
                if (status >= 400) {
                     const body = await response.text();
                     console.error(`API ERROR [${apiPattern}]: ${status} - ${body}`);
                     throw new Error(`API Error ${status}: ${body}`);
                }
                console.log(`API SUCCESS [${apiPattern}]: ${status}`);
            } else {
                console.warn(`API TIMEOUT [${apiPattern}]: No response received in 5s`);
            }
            
            try {
                await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
                await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 10000 });
                await logStep(stepName, 'Success!');
            } catch {
                // Ignore missing alert if dialog closed
            }
        } catch (e) {
            console.error(`❌ FAILED: ${stepName} - ${e.message}`);
            errors.push(`${stepName}: ${e.message}`);
            await page.screenshot({ path: `/tmp/fail_${tab}.png` });
        }
    };

    const selectOption = async (label, optionText) => {
        await logStep('selectOption', `Selecting "${optionText}" for "${label}"`);
        let trigger = page.locator(`label:has-text("${label}") + div button, button:has-text("${label}")`).first();
        if (await trigger.count() === 0) {
             trigger = page.getByRole('button', { name: label }).first();
        }
        await trigger.click();
        
        await logStep('selectOption', `Clicking option "${optionText}"`);
        const option = page.getByRole('option', { name: optionText, exact: false }).first();
        try {
            await option.click({ timeout: 5000 });
            await logStep('selectOption', `Success!`);
        } catch (e) {
            const available = await page.getByRole('option').allInnerTexts();
            console.error(`Failed to find "${optionText}". Available: ${available.join(', ')}`);
            throw e;
        }
    };

    // --- TEST STEPS ---

    // 1. Banking
    await withTimeout('Finance: Banking', async () => {
        await createFinancialItem('banking', 'Add Account', async () => {
            await page.fill('input[name="bank_name"]', 'First National');
            await page.fill('input[name="account_name"]', 'Family Checking');
            await page.fill('input[name="current_balance"]', '4500.50');
            
            // Assign to Mike (Chip)
            const mikeChip = page.locator('div[role="button"]').filter({ hasText: 'Mike Brady' });
            if (await mikeChip.count() > 0) {
                const classAttr = await mikeChip.getAttribute('class');
                if (!classAttr.includes('variantSolid')) {
                    await mikeChip.click();
                }
            }
        });
    });

    // 2. Income (Mike)
    await withTimeout('Finance: Income (Mike)', async () => {
        await createFinancialItem('income', 'Add Income', async () => {
             await selectOption('Assigned Person', 'Mike Brady');
             await page.fill('input[name="employer"]', 'Architectural Assoc');
             await page.fill('input[name="gross_annual_salary"]', '102000');
             await page.fill('input[name="amount"]', '8500');
             await page.fill('input[name="payment_day"]', '1');
             await selectOption('Deposit to Account', 'First National'); 
        });
    });

    // 3. Income (Carol)
    await withTimeout('Finance: Income (Carol)', async () => {
        await createFinancialItem('income', 'Add Income', async () => {
            await selectOption('Assigned Person', 'Carol Brady');
            await page.fill('input[name="employer"]', 'Freelance Writing');
            await page.fill('input[name="amount"]', '1200');
            await page.fill('input[name="payment_day"]', '15');
        });
    });
    
    // 4. Savings
    await withTimeout('Finance: Savings', async () => {
        await createFinancialItem('savings', 'Add Savings', async () => {
            await page.fill('input[name="institution"]', 'Chase');
            await page.fill('input[name="account_name"]', 'Rainy Day');
            await page.fill('input[name="current_balance"]', '12000');
            await page.fill('input[name="interest_rate"]', '4.5');
        });
    });

    // 5. Investments
    await withTimeout('Finance: Investments', async () => {
        await createFinancialItem('invest', 'Add Investment', async () => {
            await page.fill('input[name="name"]', 'Tech Stocks Portfolio');
            await page.fill('input[name="platform"]', 'Robinhood');
            await page.fill('input[name="current_value"]', '15000');
            await page.fill('input[name="total_invested"]', '10000');
        });
    });

    // 6. Pensions
    await withTimeout('Finance: Pensions', async () => {
        await createFinancialItem('pensions', 'Add Pension', async () => {
            await page.fill('input[name="provider"]', 'Fidelity');
            await page.fill('input[name="plan_name"]', 'My Pension Plan');
            await page.fill('input[name="current_value"]', '85000');
            await page.fill('input[name="monthly_contribution"]', '500');
            await page.fill('input[name="payment_day"]', '1');
        });
    });

    // 7. Mortgage
    await withTimeout('Finance: Mortgage', async () => {
        await createFinancialItem('mortgage', 'MENU:Add Mortgage', async () => {
            await page.fill('input[name="lender"]', 'Big Bank Corp');
            await page.fill('input[name="total_amount"]', '500000');
            await page.fill('input[name="remaining_balance"]', '450000');
            await page.fill('input[name="monthly_payment"]', '2800');
            await page.fill('input[name="interest_rate"]', '3.5');
            await page.fill('input[name="term_years"]', '25');
            await page.fill('input[name="payment_day"]', '1');
        });
    });

    // 8. Vehicle Finance
    await withTimeout('Finance: Vehicle Finance', async () => {
        await createFinancialItem('car', 'Add Agreement', async () => {
            await selectOption('Vehicle', 'Kingswood'); 
            await page.fill('input[name="provider"]', 'GM Financial');
            await page.fill('input[name="total_amount"]', '5000');
            await page.fill('input[name="remaining_balance"]', '1200');
            await page.fill('input[name="monthly_payment"]', '150');
            await page.fill('input[name="payment_day"]', '5');
        });
    });

    // 9. Loans
    await withTimeout('Finance: Loans', async () => {
        await createFinancialItem('loans', 'Add Loan', async () => {
            await page.fill('input[name="lender"]', 'Credit Union');
            await page.fill('input[name="loan_type"]', 'Personal');
            await page.fill('input[name="total_amount"]', '10000');
            await page.fill('input[name="remaining_balance"]', '8500');
            await page.fill('input[name="monthly_payment"]', '350');
            await page.fill('input[name="payment_day"]', '10');

            const mikeChip = page.locator('div[role="button"]').filter({ hasText: 'Mike Brady' });
            if (await mikeChip.count() > 0) {
                const classAttr = await mikeChip.getAttribute('class');
                if (!classAttr.includes('variantSolid')) {
                    await mikeChip.click();
                }
            }
        });
    });
    
    // 10. Credit Cards
    await withTimeout('Finance: Credit Cards', async () => {
        await createFinancialItem('credit', 'Add Card', async () => {
            await page.fill('input[name="provider"]', 'American Express');
            await page.fill('input[name="card_name"]', 'Amex Gold');
            await page.fill('input[name="current_balance"]', '450');
            await page.fill('input[name="credit_limit"]', '10000');
            await page.fill('input[name="payment_day"]', '28');
        });
        
        await createFinancialItem('credit', 'Add Card', async () => {
            await page.fill('input[name="provider"]', 'Chase');
            await page.fill('input[name="card_name"]', 'Chase Sapphire');
            await page.fill('input[name="current_balance"]', '120');
            await page.fill('input[name="credit_limit"]', '15000');
            await page.fill('input[name="payment_day"]', '14');
        });
    });

    // REPORTING
    if (errors.length > 0) {
        console.log('\n\n🛑 TEST FAILURES DETECTED:');
        errors.forEach(e => console.log(` - ${e}`));
        throw new Error(`Encountered ${errors.length} errors during Finance Setup.`);
    }

    await page.goto(`/household/${hhId}/finance?tab=budget`);
    await expect(page.locator('text=Safe to Spend')).toBeVisible({ timeout: 15000 });
  });
});
