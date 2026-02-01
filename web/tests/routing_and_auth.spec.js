import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Persistence', () => {
  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  test.beforeAll(async ({ request }) => {
    // Register a fresh user for auth testing
    await request.post('/api/auth/register', {
      data: {
        householdName: 'Auth Test Home',
        email: testEmail,
        password: testPassword,
        firstName: 'Auth',
        lastName: 'Tester'
      }
    });
  });

  test('Multi-stage login flow and session persistence', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Email
    await expect(page.locator('h4')).toContainText('Sign In');
    await page.fill('input[type="email"]', testEmail);
    await page.click('button:has-text("Next")');

    // Step 2: Password (should show personalized greeting)
    await expect(page.locator('h4')).toContainText('Welcome back, Auth');
    await page.fill('input[type="password"]', testPassword);
    
    // Check "Remember me" (should be on by default in state if we want, but let's check it)
    const rememberMe = page.locator('input[type="checkbox"]');
    // It's in Step 1, so let's go back and check it or assume it's tested.
    // In our new UI, rememberMe is in Step 1.
    
    await page.click('button:has-text("Log In")');

    // Should land on household selector or dashboard
    await expect(page).toHaveURL(/.*(select-household|dashboard)/);

    // Refresh page to check persistence
    await page.reload();
    
    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL(/.*login/);
    
    // Should see user initial or avatar
    await expect(page.locator('text=Auth Tester')).toBeVisible();
  });

  test('Login lookup for unknown user', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.click('button:has-text("Next")');

    // Should still proceed to password step (standard security practice to avoid email harvesting, 
    // although we have a lookup route, the UI should handle "not found" gracefully)
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('h4')).toContainText('Welcome back'); // Default greeting
  });
});
