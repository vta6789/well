const { test, expect } = require('@playwright/test');

test('Enter in login submits credentials without switching to registration', async ({ page }) => {
  await page.goto('/');
  await page.locator('#navAuthArea [data-action="login"]').click();
  await page.locator('#auth-form input[name="email"]').fill('admin@e2e.test');
  await page.locator('#auth-password').fill('Admin-e2e-test-12345');
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/login') && response.request().method() === 'POST');
  await page.locator('#auth-password').press('Enter');
  expect((await responsePromise).status()).toBe(200);
  await expect(page.locator('#modal')).not.toBeVisible();
  await expect(page.locator('.admin-workspace')).toBeVisible();
});
