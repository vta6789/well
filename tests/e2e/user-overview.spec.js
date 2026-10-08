const { test, expect } = require('@playwright/test');

async function menu(page, title) {
  const mobile = page.locator('.project-mobile-nav');
  if (await mobile.isVisible()) {
    await mobile.locator('summary').click();
    return mobile.locator('section').filter({ has: page.locator('h2').filter({ hasText: title }) });
  }
  const group = page.locator('.project-function-menu').filter({ has: page.locator('summary').filter({ hasText: title }) });
  await group.locator('summary').click();
  return group;
}

test('online record, reminders, live event calendar and workshop suggestions', async ({ page, playwright }, info) => {
  const origin = 'http://127.0.0.1:8123';
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    const login = await admin.post('/api/login', { headers: { Origin: origin }, data: { email: 'admin@e2e.test', password: 'Admin-e2e-test-12345' } });
    expect(login.status()).toBe(200);
    const { csrf } = await login.json();
    const headers = { Origin: origin, 'X-CSRF-Token': csrf };
    const date = new Date();
    const today = date.toLocaleDateString('en-CA');
    date.setDate(date.getDate() + 1);
    const tomorrow = date.toLocaleDateString('en-CA');
    const suffix = `${Date.now()}-${info.project.name}`;
    const todayName = `Hôm nay ${suffix}`;
    const nextName = `Ngày mai ${suffix}`;
    for (const [name, day, active] of [[todayName, today, true], [nextName, tomorrow, true], [`Ẩn ${suffix}`, tomorrow, false]]) {
      const response = await admin.post('/api/activities', { headers, data: { name, date: day, time: '09:00', location: 'Vườn học tập', capacity: 6, active } });
      expect(response.status()).toBe(200);
    }
    const registration = await page.context().request.post(origin + '/api/register', { headers: { Origin: origin }, data: { name: 'Người dùng thử', email: `overview-${suffix}@example.test`, password: 'Overview-test-12345' } });
    expect(registration.status()).toBe(200);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Lịch hôm nay' })).toBeVisible();
    await expect(page.locator('.dashboard-schedule')).toContainText(todayName);
    await expect(page.locator('.dashboard-schedule')).not.toContainText(nextName);
    await expect(page.locator('footer')).toContainText('Malware (tác giả)');

    const overview = await menu(page, 'Tổng quan');
    for (const label of ['Lịch sự kiện', 'Hành trình giá trị', 'Vườn riêng & câu chuyện'])
      await expect(overview.getByRole('button', { name: label, exact: true })).toBeVisible();
    await expect(overview.getByRole('button', { name: 'Nhắc việc', exact: true })).toHaveCount(0);
    await overview.getByRole('button', { name: 'Lịch sự kiện', exact: true }).click();
    await expect(page.locator('.calendar-cell.today')).toContainText(todayName);
    await expect(page.locator('.calendar-reminders').getByRole('heading', { name: 'Nhắc việc' })).toBeVisible();

    const online = await menu(page, 'Đăng ký online');
    await online.getByRole('button', { name: 'Sổ đăng ký online', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sổ đăng ký online' })).toBeVisible();

    const registrationMenu = await menu(page, 'Đăng ký online');
    await expect(registrationMenu.getByRole('button', { name: 'Đăng ký làm chuyên gia', exact: true })).toBeVisible();
    await registrationMenu.getByRole('button', { name: 'Đăng ký workshop', exact: true }).click();
    const recommendations = page.locator('.workshop-recommendations');
    await expect(recommendations).toContainText(todayName);
    await expect(recommendations).not.toContainText(`Ẩn ${suffix}`);
    await recommendations.locator('.learning-workshop').filter({ hasText: todayName }).getByRole('button', { name: 'Đăng ký tham gia' }).click();
    await expect(page.locator('#record-form')).toBeVisible();
    await expect(page.locator('#modal')).toContainText('Hồ sơ');
    await page.locator('#modal .modal-head [data-action="close"]').click();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Upcoming events' })).toBeVisible();
    const englishOverview = await menu(page, 'Overview');
    await englishOverview.getByRole('button', { name: 'Event calendar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Event calendar' })).toBeVisible();
    const englishOnline = await menu(page, 'Online registration');
    await englishOnline.getByRole('button', { name: 'Online registration record', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Online registration record' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await admin.dispose();
  }
});
