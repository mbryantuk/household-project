import { test, expect } from '@playwright/test';

test('Theme selection and persistence', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('mbryantuk@gmail.com');
  await page.getByLabel('Password').fill('test');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL(/select-household/);
  await page.getByRole('button', { name: 'Household #60 (Bryant)' }).click();
  await page.waitForURL(/household/);
  await page.getByRole('button', { name: 'Open drawer' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  const themeSelect = page.getByLabel('Select Theme');
  await themeSelect.selectOption('dark');
  expect(await themeSelect.inputValue()).toBe('dark');

  await page.reload();
  await page.getByRole('button', { name: 'Open drawer' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  expect(await themeSelect.inputValue()).toBe('dark');
});
