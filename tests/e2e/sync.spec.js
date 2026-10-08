const { test, expect } = require('@playwright/test');
test.use({ reducedMotion: 'reduce' });
const origin = 'http://127.0.0.1:8123';
const password = 'Browser-sync-test-12345';

async function register(page, name) {
  const email = `sync-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const response = await page.request.post('/api/register', { headers: { Origin: origin }, data: { name, email, password } });
  expect(response.status()).toBe(200);
  return { ...(await response.json()), email };
}
async function menu(page, id) {
  const mobile = page.locator('.project-mobile-nav');
  const navigation = await mobile.isVisible() ? mobile : page.locator('.project-desktop-nav');
  const link = navigation.locator(`[data-page="${id}"]`);
  await link.locator('xpath=ancestor::details[1]').locator('summary').click();
  await link.click();
}
async function regainFocus(page) {
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.dispatchEvent(new Event('focus'));
  });
}

test('independent browser sessions share data on focus and preserve an unfinished form', async ({ page, browser }, info) => {
  const account = await register(page, 'Người dùng đồng bộ');
  const secondContext = await browser.newContext({ baseURL: origin, viewport: info.project.use.viewport, reducedMotion: 'reduce' });
  try {
    const second = await secondContext.newPage();
    const login = await second.request.post('/api/login', { headers: { Origin: origin }, data: { email: account.email, password } });
    expect(login.status()).toBe(200);
    const secondSession = await login.json();
    expect(secondSession.user.id).toBe(account.user.id);
    await second.goto('/');
    await expect(second.locator('.project-app-header')).toBeVisible();
    await menu(second, 'journey');
    await second.getByRole('button', { name: 'Tạo hồ sơ người học', exact: true }).click();
    const draft = second.locator('#modal input[name="name"]');
    await draft.fill('Hồ sơ đang nhập');
    const headers = { Origin: origin, 'X-CSRF-Token': account.csrf };
    const profileResponse = await page.request.post('/api/residents', { headers, data: { name: 'Hồ sơ dùng chung', dob: '1960-01-01' } });
    expect(profileResponse.status()).toBe(200);
    const profile = await profileResponse.json();
    await regainFocus(second);
    await second.waitForTimeout(500);
    await expect(draft).toHaveValue('Hồ sơ đang nhập');
    await expect(second.getByRole('dialog')).toBeVisible();
    await second.keyboard.press('Escape');
    await expect(second.locator('#journey-resident')).toContainText('Hồ sơ dùng chung');
    const practice = await page.request.post('/api/practice', { headers, data: { resident: profile.id, title: 'Ghi nhận từ trình duyệt khác', date: new Date().toISOString().slice(0, 10), notes: 'Cùng một dữ liệu máy chủ' } });
    expect(practice.status()).toBe(200);
    await regainFocus(second);
    await expect(second.locator('#main')).toContainText('Ghi nhận từ trình duyệt khác');
    expect(await second.locator('#journey-resident').inputValue()).toBe(profile.id);
  } finally { await secondContext.close(); }
});

test('a delayed sync cannot restore private data after switching accounts', async ({ page }) => {
  const account = await register(page, 'Tài khoản thứ nhất');
  const response = await page.request.post('/api/residents', { headers: { Origin: origin, 'X-CSRF-Token': account.csrf }, data: { name: 'Hồ sơ riêng của tài khoản cũ', dob: '1960-01-01' } });
  expect(response.status()).toBe(200);
  await page.goto('/');
  await expect(page.locator('.project-app-header')).toBeVisible();
  let release, arrived, held = false;
  const gate = new Promise(resolve => { release = resolve; });
  const pending = new Promise(resolve => { arrived = resolve; });
  await page.route('**/api/residents', async route => {
    if (held) return route.continue();
    held = true;
    const fetched = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response: fetched });
  });
  try {
    await regainFocus(page);
    await pending;
    await page.locator('.project-user-menu summary').click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.locator('#navAuthArea [data-action="register"]').click();
    await page.locator('#auth-form input[name="name"]').fill('Tài khoản mới');
    await page.locator('#auth-form input[name="email"]').fill(`new-sync-${Date.now()}@example.test`);
    await page.locator('#auth-form input[name="password"]').fill(password);
    await page.locator('#auth-form button[type="submit"]').click();
    await expect(page.locator('.project-user-name')).toHaveText('Tài khoản mới');
    release();
    await page.waitForLoadState('networkidle');
    await menu(page, 'residents');
    await expect(page.locator('#main')).not.toContainText('Hồ sơ riêng của tài khoản cũ');
    await expect(page.locator('#main')).toContainText('Chưa có dữ liệu');
  } finally { release(); }
});
