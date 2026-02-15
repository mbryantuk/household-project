import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const email = `auth_test_${timestamp}@example.com`;
  const password = 'Password123!';
  const householdName = `Auth Test Household ${timestamp}`;

  test('should register a new user and household', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Fill Registration Form
    await page.fill('input[name="householdName"]', householdName);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    
    await page.click('button[type="submit"]');

    // Should redirect to Login after successful registration
    await expect(page).toHaveURL(/\/login/);
    
    // Now perform Login (Multi-step)
    // Step 1: Email
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Next")');
    
    // Step 2: Password (wait for transition)
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');

    // Should now be on Dashboard or Select Household
    // We increase timeout here because initial login might take a moment to fetch profile
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    // Verify dashboard loaded (Greeting)
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');
    await page.waitForURL(/\/dashboard/);

    // Click Account Avatar in Sidebar (bottom on desktop)
    await page.getByLabel('Account').click();
    
    // Click Logout
    await page.locator('div[role="button"]:has-text("Log Out")').click();
    
    // Confirm Dialog
    await page.locator('button:has-text("Proceed")').click();

    await expect(page).toHaveURL('/login');
  });

  test('should login with existing credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Log In")');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(householdName)).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.click('button:has-text("Next")');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button:has-text("Log In")');

    await expect(page.getByRole('alert')).toContainText(/Invalid|Incorrect|failed/i);
  });
});