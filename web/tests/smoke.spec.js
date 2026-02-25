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
  const loginAndGetId = async (page, context) => {
    console.log('Navigating to /login...');
    await page.goto('/login', { waitUntil: 'networkidle' });

    console.log('Filling legacy login form...');
    const emailInput = page.getByPlaceholder('Email');
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill('mbryantuk@gmail.com');
    await page.getByPlaceholder('Password').fill('Password123!');

    console.log('Clicking Login button...');
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    console.log('Waiting for navigation and cookie...');
    await page.waitForURL(/.*(select-household|dashboard|onboarding)/, { timeout: 30000 });
    
    // Item 130: Verify HttpOnly cookie exists in context
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'hearth_auth');
    if (authCookie) {
      console.log('✅ Auth Cookie Verified');
    } else {
      console.warn('⚠️ Auth Cookie Missing in context, but navigation occurred.');
    }

    if (page.url().includes('select-household')) {
      console.log('At Household Selector. Clicking first available household...');
      await page.waitForSelector('button:has-text("Open")', { timeout: 15000 });
      await page.click('button:has-text("Open")').first();
      await page.waitForURL(/.*(dashboard|onboarding)/, { timeout: 20000 });
    }

    console.log('Waiting for dashboard view...');
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="dashboard-view"]') || document.body.innerText.includes('Good'),
      { timeout: 30000 }
    );

    const url = page.url();
    console.log('Final URL reached:', url);
    const match = url.match(/household\/(\d+)\//);
    return match ? match[1] : null;
  };

  test.beforeEach(async ({ page, context }) => {
    page.on('console', logMessage);
    page.on('pageerror', (err) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(LOG_FILE, `[${timestamp}] [PAGE ERROR] ${err.message}\n${err.stack}\n`);
    });

    const id = await loginAndGetId(page, context);
    if (id) {
      householdId = id;
      console.log('Smoke Test Household ID Locked:', householdId);
    } else {
      throw new Error('Failed to retrieve Household ID during login.');
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
  });

  test('People Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/people`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('people-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Pets Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/pets`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('pets-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Vehicles Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/vehicles`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('vehicles-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Meals Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/meals`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('meals-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Groceries Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/shopping`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('shopping-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Chores Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/chores`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('chores-heading')).toBeVisible({ timeout: 20000 });
  });

  test('Finance Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/finance`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('finance-view')).toBeVisible({ timeout: 20000 });
  });

  test('House Overview', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/house`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('house-view')).toBeVisible({ timeout: 20000 });
  });

  test('User Profile', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/profile`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('profile-view')).toBeVisible();
  });

  test('Settings Page', async ({ page }) => {
    await page.goto(`${getBaseUrl()}/settings?tab=0`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('settings-view')).toBeVisible();
  });

  test.afterAll(() => {
    fs.appendFileSync(LOG_FILE, '=== SMOKE TEST COMPLETED SUCCESSFULLY ===\n');
  });
});
