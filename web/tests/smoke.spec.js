import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.resolve(__dirname, '../playwright-smoke.log');
const AUTH_FILE = path.resolve(__dirname, '../test-results/auth.json');

// Helper to log console messages
const logMessage = (msg) => {
    const timestamp = new Date().toISOString();
    const text = `[${timestamp}] [${msg.type()}] ${msg.text()}\n`;
    fs.appendFileSync(LOG_FILE, text);
};

test.describe.serial('Hearth Frontend Smoke Test', () => {
    let householdId;

    test.beforeAll(async ({ browser }) => {
        if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
        fs.writeFileSync(LOG_FILE, '=== STARTING SMOKE TEST ===\n');

        // Create auth context
        const context = await browser.newContext();
        const page = await context.newPage();

        await test.step('Login & Setup State', async () => {
            await page.goto('/login');
            await page.fill('input[type="email"]', 'mbryantuk@gmail.com');
            await page.click('button:has-text("Next")');
            await page.waitForSelector('input[type="password"]');
            await page.fill('input[type="password"]', 'Password123!');
            await page.click('button:has-text("Log In")');

            await page.waitForURL(/.*(select-household|dashboard)/, { timeout: 30000 });
            
            if (page.url().includes('select-household')) {
                await page.click('text=/The Brady Bunch/i');
                await page.waitForURL(/.*dashboard/);
            }

            const url = page.url();
            const match = url.match(/household\/(\d+)\//);
            householdId = match ? match[1] : null;
            expect(householdId).not.toBeNull();

            // Save storage state
            await context.storageState({ path: AUTH_FILE });
            await page.close();
        });
    });

    // Use the saved storage state for all tests in this describe block
    test.use({ storageState: AUTH_FILE });

    test.beforeEach(async ({ page }) => {
        page.on('console', logMessage);
        page.on('pageerror', (err) => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(LOG_FILE, `[${timestamp}] [PAGE ERROR] ${err.message}\n${err.stack}\n`);
        });
        
        // Ensure householdId is available (it should be from beforeAll, but scope might be an issue if not careful)
        // Since we can't easily pass variables from beforeAll to tests in separate scopes without globals, 
        // we'll re-fetch it or assume a fixed ID if needed, but let's try to grab it from URL if we navigate.
        // Actually, we can just use the householdId variable if it's in the outer scope.
        // However, householdId is set in beforeAll which runs in a different worker scope potentially?
        // No, serial mode + same file means shared scope for variables defined outside.
    });

    const getBaseUrl = () => `/household/${householdId}`;

    test('Dashboard Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('body')).not.toContainText('Endpoint not found');
        await expect(page.getByText(/Good|Welcome/i).first()).toBeAttached();
    });

    test('Calendar Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/calendar`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Calendar/i).first()).toBeAttached();
    });

    test('People Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/people`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/People/i).first()).toBeAttached();
    });

    test('Pets Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/pets`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Pets/i).first()).toBeAttached();
    });

    test('Vehicles Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/vehicles`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Vehicle/i).first()).toBeAttached();
    });

    test('Meals Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/meals`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Meal/i).first()).toBeAttached();
    });

    test('Groceries Page & Import Button', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/shopping`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Groceries/i).first()).toBeAttached();
        
        const importBtn = page.getByRole('button', { name: /Import Historical Receipt/i });
        await expect(importBtn).toBeVisible();
    });

    test('Chores Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/chores`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByText(/Chores/i).first()).toBeAttached();
    });

    test('Finance Page & Banking Import', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/finance`); 
        await expect(page.locator('body')).toBeVisible();
        
        // Handle "No Profile" case if it appears (though reusing state should keep it if created)
        // But since we are reusing state, we might need to handle it once.
        const hasWarning = await page.getByText(/No Financial Profile Found/i).isVisible();
        if (hasWarning) {
            await page.click('button:has-text("Create Profile")');
            await page.fill('input[name="name"]', 'Smoke Test Profile');
            await page.click('button:has-text("Create")');
            await page.waitForTimeout(3000); 
        }

        await page.click('text=/Current Accounts/i');
        await page.waitForTimeout(3000);

        const importBtn = page.getByRole('button', { name: /Import Statement/i });
        await expect(importBtn).toBeVisible();
    });

    test('Onboarding Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/onboarding`);
        await expect(page.getByText(/Welcome to Hearthstone/i)).toBeVisible();
        await expect(page.getByText(/Family & Pets/i)).toBeVisible();
    });

    test('House Overview Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/house`);
        await expect(page.getByText(/House/i).first()).toBeVisible();
    });

    test('Property Details Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/house/details`);
        await expect(page.getByText(/Properties|Household/i).first()).toBeVisible();
    });

    test('Asset Register Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/house/assets`);
        await expect(page.getByText(/Asset|Register/i).first()).toBeVisible();
    });

    test('User Profile Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/profile`);
        await expect(page.getByText(/Profile/i).first()).toBeVisible();
    });

    test('Settings Pages (All Tabs)', async ({ page }) => {
        const base = getBaseUrl();
        
        await test.step('Profile Tab', async () => {
            await page.goto(`${base}/settings?tab=0`);
            await expect(page.getByText(/Profile/i).first()).toBeVisible();
        });

        await test.step('Security Tab', async () => {
            await page.goto(`${base}/settings?tab=1`);
            await expect(page.getByText(/Security/i).first()).toBeVisible();
        });

        await test.step('Appearance Tab', async () => {
            await page.goto(`${base}/settings?tab=2`);
            await expect(page.getByText(/Appearance/i).first()).toBeVisible();
        });

        await test.step('API Tab', async () => {
            await page.goto(`${base}/settings?tab=3`);
            await expect(page.getByText(/API/i).first()).toBeVisible();
        });

        await test.step('Admin Tab', async () => {
            await page.goto(`${base}/settings?tab=4`);
            await expect(page.getByText(/Admin/i).first()).toBeVisible();
        });
    });

    test.afterAll(() => {
        fs.appendFileSync(LOG_FILE, '=== SMOKE TEST COMPLETED SUCCESSFULLY ===\n');
    });
});