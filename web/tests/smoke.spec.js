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
    }
  });

  const getBaseUrl = () => `/household/${householdId}`;

  test('Dashboard Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/dashboard`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('dashboard-view')).toBeVisible({ timeout: 20000 });
  });

  test('Calendar Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/calendar`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('calendar-view')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('calendar-heading')).toBeVisible({ timeout: 10000 });
  });

  test('People Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/people`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'People' })).toBeVisible({ timeout: 20000 });
  });

  test('Pets Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/pets`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'Pets' })).toBeVisible({ timeout: 20000 });
  });

  test('Vehicles Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/vehicles`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'Vehicles' })).toBeVisible({ timeout: 20000 });
  });

  test('Meals Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/meals`, { waitUntil: 'networkidle' });
    await expect(
      page.locator('h2', { hasText: 'Meals' }).or(page.locator('h2', { hasText: 'Planner' }))
    ).toBeVisible({ timeout: 20000 });
  });

  test('Groceries Page & Import Button', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/shopping`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Import Historical Receipt/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('Chores Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/chores`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'Chores' })).toBeVisible({ timeout: 20000 });
  });

  test('Finance Page & Banking Import', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/finance`, { waitUntil: 'networkidle' });

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
    await page.goto(`${getBaseUrl()}/onboarding`, { waitUntil: 'networkidle' });
    await expect(page.locator('role=progressbar')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Welcome to Hearthstone/i)).toBeVisible({ timeout: 15000 });
  });

  test('House Overview Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/house`, { waitUntil: 'networkidle' });
    await expect(page.locator('h2', { hasText: 'House' })).toBeVisible({ timeout: 20000 });
  });

  test('Property Details Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/house/details`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/Household Details/i).first()).toBeVisible({ timeout: 20000 });
  });

  test('Asset Register Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/house/assets`, { waitUntil: 'networkidle' });
    await expect(
      page.locator('h2', { hasText: 'Register' }).or(page.locator('h2', { hasText: 'Assets' }))
    ).toBeVisible({ timeout: 20000 });
  });

  test('User Profile Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/profile`, { waitUntil: 'networkidle' });
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
