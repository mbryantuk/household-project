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

test.describe('Hearth Frontend Smoke Test', () => {
    let householdId;

    test.beforeAll(async () => {
        if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
        fs.writeFileSync(LOG_FILE, '=== STARTING SMOKE TEST ===\n');
    });

    test('Login and Navigate All Pages', async ({ page }) => {
        page.on('console', logMessage);
        page.on('pageerror', (err) => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(LOG_FILE, `[${timestamp}] [PAGE ERROR] ${err.message}\n${err.stack}\n`);
        });

        // 1. Login (Multi-step)
        await test.step('Login', async () => {
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

            await page.waitForTimeout(3000); 
        });

        const base = `/household/${householdId}`;

        const checkPage = async (name, path, titleRegex) => {
            await test.step(`Page: ${name}`, async () => {
                console.log(`Checking ${path}...`);
                await page.goto(path, { waitUntil: 'domcontentloaded' });
                await page.waitForTimeout(1500); 
                await expect(page.locator('body')).toBeVisible();
                await expect(page.locator('body')).not.toContainText('Endpoint not found');
                await expect(page.locator('body')).not.toContainText('System Upgrade in Progress');
                if (titleRegex) {
                    await expect(page.getByText(titleRegex).first()).toBeAttached({ timeout: 20000 });
                }
            });
        };

        // 2. Core Pages
        await checkPage('Dashboard', `${base}/dashboard`, /Good|Welcome/i);
        await checkPage('Calendar', `${base}/calendar`, /Calendar/i);
        await checkPage('People', `${base}/people`, /People/i);
        await checkPage('Pets', `${base}/pets`, /Pets/i);
        await checkPage('Vehicles', `${base}/vehicles`, /Vehicle/i);
        await checkPage('Meals', `${base}/meals`, /Meal/i);
        
        await test.step('Page: Groceries Import', async () => {
            await page.goto(`${base}/shopping`);
            await page.waitForTimeout(1500);
            const importBtn = page.getByRole('button', { name: /Import Receipt/i });
            await expect(importBtn).toBeVisible();
        });

        await checkPage('Groceries', `${base}/shopping`, /Groceries/i);
        await checkPage('Chores', `${base}/chores`, /Chores/i);
        await checkPage('Finance', `${base}/finance`, /Financial/i);
        
        await test.step('Page: Banking Import', async () => {
            await page.goto(`${base}/finance?tab=1`); // Banking tab
            await page.waitForTimeout(1500);
            const importBtn = page.getByRole('button', { name: /Import Statement/i });
            await expect(importBtn).toBeVisible();
        });

        await test.step('Page: Onboarding', async () => {
            await page.goto(`${base}/onboarding`);
            await expect(page.getByText(/Welcome to Hearthstone/i)).toBeVisible();
            await expect(page.getByText(/Family & Pets/i)).toBeVisible();
        });

        await checkPage('House Overview', `${base}/house`, /House/i); 
        await checkPage('Property Details', `${base}/house/details`, /Properties|Household/i);
        await checkPage('Asset Register', `${base}/house/assets`, /Asset|Register/i);
        await checkPage('User Profile', `${base}/profile`, /Profile/i);

        // 3. Settings Views (Tabbed)
        await checkPage('Settings: Profile', `${base}/settings?tab=0`, /Profile/i);
        await checkPage('Settings: Security', `${base}/settings?tab=1`, /Security/i);
        await checkPage('Settings: Appearance', `${base}/settings?tab=2`, /Appearance/i);
        await checkPage('Settings: API', `${base}/settings?tab=3`, /API/i);
        await checkPage('Settings: Admin', `${base}/settings?tab=4`, /Admin/i);

        fs.appendFileSync(LOG_FILE, '=== SMOKE TEST COMPLETED SUCCESSFULLY ===\n');
    });
});