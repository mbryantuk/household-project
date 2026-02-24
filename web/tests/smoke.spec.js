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
    await page.goto('/login', { waitUntil: 'networkidle' });

    console.log('Clearing storage...');
    await page
      .evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      })
      .catch(() => {});

    await page.goto('/login', { waitUntil: 'networkidle' });

    // INTERACT WITH LEGACY LOGIN FORM
    console.log('Filling legacy login form...');
    const emailInput = page.getByPlaceholder('Email');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill('mbryantuk@gmail.com');
    await page.getByPlaceholder('Password').fill('Password123!');

    console.log('Clicking Login button...');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    console.log('Waiting for navigation...');
    await page.waitForURL(/.*(select-household|dashboard|onboarding)/, { timeout: 30000 });
    console.log('Current URL after login:', page.url());

    if (page.url().includes('select-household')) {
      console.log('At Household Selector. Checking for Brady Bunch...');
      await page.waitForSelector('text=/Role:/i', { timeout: 15000 });

      const hasBrady = await page.getByText(/The Brady Bunch/i).isVisible();
      if (hasBrady) {
        console.log('Found The Brady Bunch. Clicking...');
        await page.click('text=/The Brady Bunch/i');
      } else {
        console.log('The Brady Bunch not found. Clicking first available household...');
        await page.click('button:has-text("Open")').first();
      }
      await page.waitForURL(/.*(dashboard|onboarding)/, { timeout: 20000 });
    }

    console.log('Waiting for dashboard or onboarding view...');
    await page.waitForFunction(
      () => {
        return (
          !!document.querySelector('[data-testid="dashboard-view"]') ||
          document.body.innerText.includes('Welcome to Hearthstone') ||
          document.body.innerText.includes('Good morning') ||
          document.body.innerText.includes('Good afternoon') ||
          document.body.innerText.includes('Good evening')
        );
      },
      { timeout: 30000 }
    );

    const url = page.url();
    console.log('Final URL reached:', url);
    const match = url.match(/household\/(\d+)\//);
    return match ? match[1] : null;
  };

  test.beforeEach(async ({ page }) => {
    page.on('console', logMessage);
    page.on('pageerror', (err) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(LOG_FILE, `[${timestamp}] [PAGE ERROR] ${err.message}\n${err.stack}\n`);
    });

    if (!householdId) {
      const id = await loginAndGetId(page);
      if (id) {
        householdId = id;
        console.log('Smoke Test Household ID Locked:', householdId);
      } else {
        throw new Error('Failed to retrieve Household ID during login.');
      }
    } else {
      if (!page.url().includes(`/household/${householdId}`)) {
        await page.goto(`/household/${householdId}/dashboard`, { waitUntil: 'networkidle' });
      }
    }
  });

  const getBaseUrl = () => `/household/${householdId}`;

  test('Dashboard Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/dashboard`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Good morning|Good afternoon|Good evening/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('Calendar Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/calendar`, { waitUntil: 'networkidle' });
    // Use a more reliable text check
    await expect(page.getByText(/Track events, holidays/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('People Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/people`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Manage the people/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Pets Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/pets`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Keep track of your furry/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('Vehicles Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/vehicles`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Manage your family vehicles/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('Meals Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/meals`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Plan your weekly meals/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Groceries Page & Import Button', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/shopping`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Your shared shopping list/i).first()).toBeVisible({
      timeout: 15000,
    });

    const importBtn = page.getByRole('button', { name: /Import Historical Receipt/i });
    await expect(importBtn).toBeVisible();
  });

  test('Chores Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/chores`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Assign and track/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Finance Page & Banking Import', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/finance`, { waitUntil: 'networkidle' });

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
    await page.goto(`${base}/onboarding`, { waitUntil: 'networkidle' });
    await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Welcome to Hearthstone/i)).toBeVisible({ timeout: 15000 });
  });

  test('House Overview Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/house`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/House|Property/i).first()).toBeVisible();
  });

  test('Property Details Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/house/details`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Manage the details of your property/i).first()).toBeVisible();
  });

  test('Asset Register Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/house/assets`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Keep track of valuable items/i).first()).toBeVisible();
  });

  test('User Profile Page', async ({ page }) => {
    const base = getBaseUrl();
    await page.goto(`${base}/profile`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'Your Profile' })).toBeVisible();
  });

  test('Settings Pages (All Tabs)', async ({ page }) => {
    const base = getBaseUrl();

    await page.goto(`${base}/settings?tab=0`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Personal Information/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=1`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Security Settings/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=2`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Theme and Appearance/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=3`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Developer API Keys/i).first()).toBeVisible();

    await page.goto(`${base}/settings?tab=4`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Household Administration/i).first()).toBeVisible();
  });

  test.afterAll(() => {
    fs.appendFileSync(LOG_FILE, '=== SMOKE TEST COMPLETED SUCCESSFULLY ===\n');
  });
});
