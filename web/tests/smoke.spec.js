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

    // INTERACT WITH LEGACY LOGIN FORM
    console.log('Filling legacy login form...');
    await page.getByPlaceholder('Email').fill('mbryantuk@gmail.com');
    await page.getByPlaceholder('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL(/.*(select-household|dashboard)/, { timeout: 30000 });

    if (page.url().includes('select-household')) {
      console.log('Selecting Brady Bunch household...');
      await page.click('text=/The Brady Bunch/i');
      await page.waitForURL(/.*dashboard/);
    }

    // Wait for dashboard to actually hydrate/settle
    await page.waitForTimeout(2000);

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

    const id = await loginAndGetId(page);
    if (id) {
      householdId = id;
    } else if (!householdId) {
      throw new Error('Failed to retrieve Household ID during login.');
    }
  });

  const getBaseUrl = () => `/household/${householdId}`;

  test('Dashboard Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeAttached();
    await expect(page.getByText(/Dashboard|Welcome|Good/i).first()).toBeVisible({ timeout: 20000 });
  });

  test('Calendar Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/calendar`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Calendar/i).first()).toBeAttached();
  });

  test('People Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/people`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/People/i).first()).toBeAttached();
  });

  test('Pets Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/pets`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Pets/i).first()).toBeAttached();
  });

  test('Vehicles Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/vehicles`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Vehicle/i).first()).toBeAttached();
  });

  test('Meals Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/meals`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Meal/i).first()).toBeAttached();
  });

  test('Groceries Page & Import Button', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/shopping`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Groceries|Shopping/i).first()).toBeAttached();

    const importBtn = page.getByRole('button', { name: /Import Historical Receipt/i });
    await expect(importBtn).toBeVisible();
  });

  test('Chores Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/chores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Chores/i).first()).toBeAttached();
  });

  test('Finance Page & Banking Import', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/finance`);

    await expect(page.getByText(/Loading Financial Data/i)).not.toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const hasWarning = await page.getByText(/No Financial Profile Found/i).isVisible();
    if (hasWarning) {
      await page.click('button:has-text("Create Profile")');
      await page.fill('input[name="name"]', 'Smoke Test Profile');
      await page.click('button[type="submit"]');
      await expect(page.getByText('Profile created')).toBeVisible({ timeout: 10000 });
    }

    const card = page.getByText(/Current Accounts|Accounts/i).first();
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.click();

    await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
    const importBtn = page.getByRole('button', { name: /Import Statement/i });
    await expect(importBtn).toBeVisible({ timeout: 10000 });
  });

  test('Onboarding Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/onboarding`);
    await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/onboarding');
    await expect(page.getByText(/Welcome/i)).toBeVisible();
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

    await page.goto(`${base}/settings?tab=0`);
    await expect(page.getByText(/Profile/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=1`);
    await expect(page.getByText(/Security/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=2`);
    await expect(page.getByText(/Appearance/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=3`);
    await expect(page.getByText(/API/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=4`);
    await expect(page.getByText(/Admin/i).first()).toBeVisible();
  });

  test.afterAll(() => {
    fs.appendFileSync(LOG_FILE, '=== SMOKE TEST COMPLETED SUCCESSFULLY ===\n');
  });
});
