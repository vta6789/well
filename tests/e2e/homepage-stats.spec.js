const { test, expect } = require('@playwright/test');

test('homepage counters finish at configured values without mobile overflow', async ({ page }) => {
  await page.goto('/');
  const stats = page.locator('.homepage-stats');
  await stats.scrollIntoViewIfNeeded();
  const counters = stats.locator('strong');
  await expect(counters).toHaveText(['50', '100+', '10.000+', '36+', '45']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `screenshots/homepage-stats-${page.viewportSize().width}.png` });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.homepage-stats strong')).toHaveText(['50', '100+', '10.000+', '36+', '45']);
});
