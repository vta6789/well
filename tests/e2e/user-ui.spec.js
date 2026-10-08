const { test, expect } = require("@playwright/test");
test.use({ reducedMotion: "reduce" });

async function learner(page, info, profile = false) {
  const result = await page.request.post('/api/register', {
    headers: { Origin: 'http://127.0.0.1:8123' },
    data: { name: 'Khách kiểm thử', email: `ui-${Date.now()}-${info.project.name}@example.test`, password: 'User-ui-test-12345' },
  });
  expect(result.status()).toBe(200);
  const session = await result.json();
  if (profile) {
    const response = await page.request.post('/api/residents', {
      headers: { Origin: 'http://127.0.0.1:8123', 'X-CSRF-Token': session.csrf },
      data: { name: 'Người học thử', dob: '1960-01-01' },
    });
    expect(response.status()).toBe(200);
  }
  await page.goto('/');
  await expect(page.locator('.project-app-header')).toBeVisible();
}

async function menuPage(page, id) {
  const mobile = page.locator('.project-mobile-nav');
  const navigation = await mobile.isVisible() ? mobile : page.locator('.project-desktop-nav');
  const link = navigation.locator(`[data-page="${id}"]`);
  const parent = link.locator('xpath=ancestor::details[1]');
  await parent.locator('summary').click();
  await link.click();
}

test('public site displays synced author information', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toContainText('Team3');
  await page.getByRole('button', { name: 'Dự án', exact: true }).click();
  await expect(page.locator('#main')).toContainText('Team3');
});

test('user logo returns to dashboard and footer follows VI EN VI', async ({ page }, info) => {
  await learner(page, info);
  await menuPage(page, 'bookings');
  const logo = page.locator('.project-app-header-inner > :first-child');
  await logo.click();
  await expect(page.getByRole('heading', { name: 'Học mỗi ngày. Tạo giá trị mỗi ngày.' })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('footer')).toContainText('Contact our team');
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.locator('footer')).toContainText('Liên Hệ Ban Quản Lý');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `screenshots/user-dashboard-${info.project.name}.png`, fullPage: false });
});

test('learning journey and skill empty states show useful text without code', async ({ page }, info) => {
  await learner(page, info, true);
  await menuPage(page, 'journey');
  await expect(page.locator('#main')).not.toContainText('${');
  await expect(page.getByText('Chưa có nội dung được ghi nhận.', { exact: true })).toHaveCount(4);
  await menuPage(page, 'skills');
  await expect(page.locator('#main')).toContainText('Chưa có kỹ năng được ghi nhận');
  await expect(page.locator('#main [data-action="new"]')).toHaveCount(0);
  await expect(page.locator('#main')).not.toContainText('Tạo mới');
});

test('cancelled package login does not reopen stale registration later', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav [data-id="packages"]').click();
  await page.locator('.learning-package [data-action="learning-package"]').first().click();
  await page.keyboard.press('Escape');
  await page.locator('#navAuthArea [data-action="register"]').click();
  await page.locator('#auth-form input[name="name"]').fill('Khách mới');
  await page.locator('#auth-form input[name="email"]').fill(`cancel-ui-${Date.now()}@example.test`);
  await page.locator('#auth-form input[name="password"]').fill('User-ui-test-12345');
  await page.locator('#auth-form button[type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Học mỗi ngày. Tạo giá trị mỗi ngày.' })).toBeVisible();
});
