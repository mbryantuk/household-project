import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.resolve(__dirname, '../playwright-smoke.log');

// Helper to log console messages
const logMessage = (msg) => {
    const timestamp = new Date().toISOString();
    const text = `[${timestamp}] [${msg.type()}] ${msg.text()}\n`;
    fs.appendFileSync(LOG_FILE, text);
};

test.describe.serial('Hearth Frontend Smoke Test', () => {
    let householdId;

    test.beforeAll(async () => {
        if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
        fs.writeFileSync(LOG_FILE, '=== STARTING SMOKE TEST ===\n');
    });

    // Helper login function
    const loginAndGetId = async (page) => {
        console.log('Navigating to /login...');
        try {
             await page.goto('/login');
             await page.waitForLoadState('networkidle');
        } catch (e) {
             console.log('Navigation error (might be redirect):', e.message);
        }

        const initialToken = await page.evaluate(() => localStorage.getItem('token'));
        console.log(`Initial Token: ${initialToken ? 'PRESENT' : 'MISSING'}`);

        console.log('Clearing storage...');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        console.log('Reloading to ensure clean state...');
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Unregister SW and reload to ensure fresh assets
        try {
            await page.evaluate(async () => {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                }
            });
        } catch {
            // Ignore context destruction errors (e.g. if redirect happens fast)
        }
        
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

        // Wait for dashboard to actually hydrate/settle to ensure auth is locked in
        await page.waitForTimeout(1000);

        const url = page.url();
        const match = url.match(/household\/(\d+)\//);
        return match ? match[1] : null;
    };

    test.beforeEach(async ({ page }) => {
        page.on('console', logMessage);
        page.on('pageerror', (err) => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(LOG_FILE, `[${timestamp}] [PAGE ERROR] ${err.message}\n${err.stack}\n`);
        });

        // Always ensure we are logged in and have an ID
        const id = await loginAndGetId(page);
        if (id) {
            householdId = id;
        } else if (!householdId) {
            throw new Error("Failed to retrieve Household ID during login.");
        }
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
        
        // Wait for loading to finish
        await expect(page.getByText(/Loading Financial Data/i)).not.toBeVisible({ timeout: 15000 });
        
        // Allow React render cycle to complete
        await page.waitForTimeout(1000);

        const hasWarning = await page.getByText(/No Financial Profile Found/i).isVisible();
        if (hasWarning) {
            await page.click('button:has-text("Create Profile")');
            await page.fill('input[name="name"]', 'Smoke Test Profile');
            await page.click('button[type="submit"]');
            
            // Wait for success and state update
            await expect(page.getByText('Profile created')).toBeVisible({ timeout: 10000 });
            await expect(page.getByText(/No Financial Profile Found/i)).not.toBeVisible({ timeout: 10000 });
        }

        // Wait for the card to be clickable with generous timeout
        const card = page.getByText(/Current Accounts/i).first();
        await expect(card).toBeVisible({ timeout: 30000 });
        await card.click();
        
        // Wait for potential loading spinner to disappear
        await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
        
        const importBtn = page.getByRole('button', { name: /Import Statement/i });
        await expect(importBtn).toBeVisible({ timeout: 10000 });
    });

    test('Onboarding Page', async ({ page }) => {
        const base = getBaseUrl();
        await page.goto(`${base}/onboarding`);
        
        // Wait for potential loading spinner
        await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
        
        // Ensure we didn't get redirected
        expect(page.url()).toContain('/onboarding');

        await expect(page.getByText(/Welcome/i)).toBeVisible();
        await expect(page.getByText(/Household Overview/i)).toBeVisible();
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
        await expect(page.locator('h2', { hasText: 'Your Profile' })).toBeVisible();
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