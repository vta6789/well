const { test, expect } = require('@playwright/test');

for (const language of ['vi', 'en']) {
  test(`login and registration password visibility (${language})`, async ({ page }, info) => {
    let authRequests = 0;
    page.on('request', request => {
      if (/\/api\/(login|register)$/.test(request.url())) authRequests++;
    });
    await page.goto('/');
    if (language === 'en') await page.locator('[data-action="language"][data-id="en"]').click();
    const show = language === 'en' ? 'Show password' : 'Hiện mật khẩu';
    const hide = language === 'en' ? 'Hide password' : 'Ẩn mật khẩu';
    for (const action of ['login', 'register']) {
      await page.locator(`#navAuthArea [data-action="${action}"]`).click();
      const input = page.locator('#auth-password');
      const toggle = page.getByRole('button', { name: show, exact: true });
      await expect(input).toHaveAttribute('type', 'password');
      await input.fill('Password-check-12345');
      await toggle.click();
      await expect(input).toHaveAttribute('type', 'text');
      await expect(input).toHaveValue('Password-check-12345');
      const conceal = page.getByRole('button', { name: hide, exact: true });
      await expect(conceal).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#auth-form')).toBeVisible();
      const bounds = await input.boundingBox();
      const buttonBounds = await conceal.boundingBox();
      expect(buttonBounds.x).toBeGreaterThanOrEqual(bounds.x);
      expect(buttonBounds.x + buttonBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      await conceal.focus();
      await page.keyboard.press('Space');
      await expect(input).toHaveAttribute('type', 'password');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(input).toHaveValue('Password-check-12345');
      await expect(input).toHaveAttribute('autocomplete', action === 'register' ? 'new-password' : 'current-password');
      await expect(input).toHaveAttribute('maxlength', '128');
      if (action === 'register') {
        await expect(input).toHaveAttribute('minlength', '12');
        await page.locator('#auth-form input[name="name"]').fill('Password toggle test');
        await page.locator('#auth-form input[name="email"]').fill(`toggle-${language}-${info.project.name}-${Date.now()}@example.test`);
        await toggle.click();
        expect(authRequests).toBe(0);
        await page.locator('#auth-form button[type="submit"]').click();
        await expect(page.locator('#modal')).not.toBeVisible();
        expect(authRequests).toBe(1);
      } else {
        await page.locator('#modal [data-action="close"]').click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}
