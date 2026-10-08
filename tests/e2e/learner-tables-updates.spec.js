const { test, expect } = require('@playwright/test');

test('learner tables, combined calendar and update indicators', async ({ page, playwright }, info) => {
  const origin = 'http://127.0.0.1:8123';
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    const login = await admin.post('/api/login', { headers: { Origin: origin }, data: { email: 'admin@e2e.test', password: 'Admin-e2e-test-12345' } });
    const adminHeaders = { Origin: origin, 'X-CSRF-Token': (await login.json()).csrf };
    const suffix = `${Date.now()}-${info.project.name}`;
    const registration = await page.context().request.post(origin + '/api/register', { headers: { Origin: origin }, data: { name: 'Người học thử', email: `tables-${suffix}@example.test`, password: 'Learner-test-12345' } });
    expect(registration.status()).toBe(200);
    const me = await (await page.context().request.get(origin + '/api/me')).json();
    const headers = { Origin: origin, 'X-CSRF-Token': me.csrf };
    const residentResponse = await page.context().request.post(origin + '/api/residents', { headers, data: { name: 'Người học thử', dob: '1950-01-01' } });
    expect(residentResponse.status()).toBe(200);
    const resident = await residentResponse.json();
    const date = new Date().toLocaleDateString('en-CA');
    const activityResponse = await admin.post('/api/activities', { headers: adminHeaders, data: { name: `Buổi học ${suffix}`, date, time: '09:00', location: 'Vườn', capacity: 8, active: true } });
    expect(activityResponse.status()).toBe(200);
    const activity = await activityResponse.json();
    const enrollment = await page.context().request.post(origin + '/api/enrollments', { headers, data: { resident: resident.id, activity_id: activity.id } });
    expect(enrollment.status()).toBe(200);
    const skill = await page.context().request.post(origin + '/api/skills', { headers, data: { resident: resident.id, title: `Kỹ năng ${suffix}`, activity_id: activity.id, status: 'Chờ xác nhận' } });
    expect(skill.status()).toBe(200);
    const practice = await page.context().request.post(origin + '/api/practice', { headers, data: { resident: resident.id, title: `Thực hành ${suffix}`, date, notes: 'Gieo hạt', result: 'Nảy mầm' } });
    expect(practice.status()).toBe(200);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Học mỗi ngày. Tạo giá trị mỗi ngày.' })).toBeVisible();
    await page.evaluate(() => { state.page = 'skills'; renderPage(); });
    await expect(page.locator('.learning-record-table table')).toContainText(`Kỹ năng ${suffix}`);
    await page.evaluate(() => { state.page = 'practice'; renderPage(); });
    await expect(page.locator('.learning-record-table table')).toContainText(`Thực hành ${suffix}`);
    await page.evaluate(() => { state.page = 'calendar'; renderPage(); });
    await expect(page.locator('.calendar-reminders')).toContainText(`Buổi học ${suffix}`);

    const newActivity = await admin.post('/api/activities', { headers: adminHeaders, data: { name: `Mới ${suffix}`, date, time: '14:00', location: 'Vườn', capacity: 8, active: true } });
    expect(newActivity.status()).toBe(200);
    await page.evaluate(async () => { await refresh(); renderPage(); });
    await expect(page.locator('[data-page="enrollments"] .update-dot').first()).toBeAttached();
    await expect(page.locator('[data-page="calendar"] .update-dot')).toHaveCount(0);
    await page.evaluate(() => { state.page = 'enrollments'; renderPage(); });
    await expect(page.locator('[data-page="enrollments"] .update-dot')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await admin.dispose();
  }
});
