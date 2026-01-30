import { test, expect } from '@playwright/test';
import { logStep, withTimeout } from './utils/testLogger.js';
import pkg from '../package.json' with { type: 'json' };
import fs from 'fs';

test.describe('Brady Lifecycle Stage 1: Foundation', () => {
  const uniqueId = Date.now();
  const password = 'Password123!';
  const householdName = `Brady Foundation (v${pkg.version})`;
  let registeredAdminEmail = '';

  test('Setup Foundation', async ({ page }) => {
    test.setTimeout(400000);

    page.on('console', msg => logStep('BROWSER', msg.text()));
    page.on('pageerror', err => logStep('BROWSER_ERROR', err.message));
    page.on('response', response => {
        if (response.url().includes('register') && response.status() >= 400) {
            logStep('API_ERROR', `${response.url()} returned ${response.status()}`);
        }
    });

    await page.waitForTimeout(2000); // Wait for DB cleanup to settle

    // Disable Service Worker
    await page.route('**/sw.js', route => route.abort());

    // Force is_test to true for registration
    await page.route('**/auth/register', async route => {
        const request = route.request();
        if (request.method() === 'POST') {
            const postData = request.postDataJSON() || {};
            postData.is_test = 1; 
            await route.continue({ postData: JSON.stringify(postData) });
        } else {
            await route.continue();
        }
    });

    await withTimeout('Mike Registration', async () => {
        let attempts = 0;
        let success = false;
        
        while (attempts < 3 && !success) {
            attempts++;
            logStep('Mike Registration', `Attempt ${attempts}...`);
            await page.goto('/register');
            await page.fill('input[name="firstName"]', 'Mike');
            await page.fill('input[name="lastName"]', 'Brady');
            const attemptEmail = `mike_${attempts}_${uniqueId}@test.com`;
            await page.fill('input[name="email"]', attemptEmail);
            await page.fill('input[name="householdName"]', householdName);
            await page.fill('input[name="password"]', password);
            await page.fill('input[name="confirmPassword"]', password);
            await page.click('button[type="submit"]');
            
            try {
                await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
                success = true;
                registeredAdminEmail = attemptEmail;
            } catch (err) {
                const errorText = await page.locator('.MuiAlert-root, [role="alert"]').innerText().catch(() => 'No visible error');
                logStep('Mike Registration', `Attempt ${attempts} FAILED. Page Error: ${errorText}`);
                if (attempts === 3) throw err;
                await page.waitForTimeout(2000);
            }
        }
    });

    await withTimeout('Mike Login', async () => {
        await page.fill('input[type="email"]', registeredAdminEmail);
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*dashboard/);
    });

    const hhId = page.url().match(/\/household\/(\d+)/)[1];
    logStep('Foundation', `Brady Household ID: ${hhId}`);

    await withTimeout('Route Check', async () => {
        const routes = ['dashboard', 'calendar', 'house', 'meals', 'finance', 'settings'];
        for (const route of routes) {
            logStep('Route Check', `Checking /${route}`);
            await page.goto(`/household/${hhId}/${route}`);
            await expect(page.locator('body')).not.toContainText('404');
        }
    });

    await withTimeout('Grant Lead Architect Access', async () => {
        await page.goto(`/household/${hhId}/settings?tab=0`);
        await page.waitForLoadState('networkidle');
        
        logStep('Grant Access', 'Inviting mbryantuk@gmail.com as Admin');
        await page.click('button:has-text("Invite User")');
        await page.waitForSelector('input[name="email"]');
        await page.fill('input[name="email"]', 'mbryantuk@gmail.com');
        await page.fill('input[name="first_name"]', 'Matt');
        
        await page.click('label:has-text("Role") + div button');
        await page.click('li[role="option"]:has-text("Administrator")');
        
        await page.click('button:has-text("Send Invitation")');
        
        // Wait for ANY result (Modal or Snackbar)
        const modalSuccess = page.locator('text=Invitation Sent');
        const snackbar = page.locator('div.MuiSnackbar-root');
        
        await expect(modalSuccess.or(snackbar)).toBeVisible({ timeout: 15000 });
        
        const resultText = await modalSuccess.or(snackbar).innerText();
        logStep('Grant Access', `Result: ${resultText}`);
        
        if (await modalSuccess.isVisible()) {
            await page.click('button:has-text("Done")');
        }
    });

    await withTimeout('Invite Family', async () => {
        await page.goto(`/household/${hhId}/settings?tab=0`);
        
        // Intercept to set password for invitations
        await page.route('**/api/households/*/users', async route => {
            const request = route.request();
            if (request.method() === 'POST') {
                const payload = request.postDataJSON() || {};
                payload.password = password;
                await route.continue({ postData: JSON.stringify(payload) });
            } else {
                await route.continue();
            }
        });

        const family = [
            { name: 'Carol', role: 'Standard Member', email: `carol_${uniqueId}@test.com` },
            { name: 'Greg', role: 'Viewer (Read-only)', email: `greg_${uniqueId}@test.com` },
            { name: 'Marcia', role: 'Viewer (Read-only)', email: `marcia_${uniqueId}@test.com` },
            { name: 'Peter', role: 'Viewer (Read-only)', email: `peter_${uniqueId}@test.com` },
            { name: 'Jan', role: 'Viewer (Read-only)', email: `jan_${uniqueId}@test.com` },
            { name: 'Bobby', role: 'Viewer (Read-only)', email: `bobby_${uniqueId}@test.com` },
            { name: 'Cindy', role: 'Viewer (Read-only)', email: `cindy_${uniqueId}@test.com` }
        ];

        for (const member of family) {
            logStep('Invite Family', `Inviting ${member.name} (${member.role})`);
            await page.click('button:has-text("Invite User")');
            await page.fill('input[name="email"]', member.email);
            await page.fill('input[name="first_name"]', member.name);
            await page.click('label:has-text("Role") + div button');
            await page.click(`li[role="option"]:has-text("${member.role}")`);
            await page.click('button:has-text("Send Invitation")');
            await expect(page.locator('text=Invitation Sent')).toBeVisible();
            await page.click('button:has-text("Done")');
        }
    });

    await withTimeout('Add Residents & House', async () => {
        await page.goto(`/household/${hhId}/house`);
        
        const generateDOB = (age) => {
            const year = 2026 - age;
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        };

        const addPerson = async (firstName, lastName, age, type = 'Adult') => {
            const dob = generateDOB(age);
            logStep('Add Residents', `Adding ${firstName} (${type}, Age: ${age}, DOB: ${dob})`);
            await page.click(`button:has-text("Add ${type}")`);
            await page.fill('input[name="first_name"]', firstName);
            await page.fill('input[name="last_name"]', lastName);
            await page.fill('input[name="dob"]', dob);
            await page.click('button:has-text("Create Person")');
            await page.waitForURL(new RegExp(`/household/${hhId}/house`));
            // VERIFY visible
            await expect(page.locator('div.MuiCard-root', { hasText: firstName }).first()).toBeVisible({ timeout: 10000 });
        };

        // 1. Add Adults
        await addPerson('Mike', 'Brady', 40, 'Adult');
        await addPerson('Carol', 'Brady', 35, 'Adult');
        await addPerson('Alice', 'Nelson', 45, 'Adult');

        // 2. Add Children
        const kids = [
            { name: 'Greg', age: 14 },
            { name: 'Marcia', age: 13 },
            { name: 'Peter', age: 11 },
            { name: 'Jan', age: 10 },
            { name: 'Bobby', age: 8 },
            { name: 'Cindy', age: 7 }
        ];
        
        for (const kid of kids) {
            await addPerson(kid.name, 'Brady', kid.age, 'Child');
        }
        
        logStep('Add Residents', 'Adding Property Assets');
        await page.click('text=Manage Property & Assets');
        await page.click('button[role="tab"]:has-text("Assets")');
        await page.click('button:has-text("Add Asset")');
        await page.fill('input[name="name"]', 'Brady House');
        await page.fill('input[name="purchase_value"]', '1200000');
        await page.click('button:has-text("Save Asset")');
    });

    // Save context for Stage 2
    const context = { hhId, adminEmail: registeredAdminEmail, password, uniqueId };
    fs.writeFileSync('/tmp/brady_context.json', JSON.stringify(context));
  });
});
