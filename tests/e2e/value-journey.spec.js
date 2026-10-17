const { test, expect } = require("@playwright/test");
test.use({ reducedMotion: "reduce" });
const origin = "http://127.0.0.1:8123";

test("package opportunities explain each path in both languages", async ({ page }, info) => {
  await page.goto("/");
  await page.locator('nav [data-id="packages"]').click();
  const plans = page.locator(".learning-package");
  await expect(plans.locator(".experience-opportunities")).toHaveCount(3);
  await expect(plans.filter({ hasText: "Gói Tháng" }).locator(".experience-opportunities")).toContainText("Sẻ chia giá trị");
  await expect(plans.filter({ hasText: "Gói Ngày" }).locator(".experience-opportunities")).toContainText("Làm quen");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(plans.locator(".experience-opportunities").first()).toContainText("Experience opportunities");
  await expect(plans.filter({ hasText: "Month Package" }).locator(".experience-opportunities")).toContainText("Share your value");
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `screenshots/value-packages-${info.project.name}.png`, fullPage: true });
});

test("the plant remains visible before a learner profile or package exists", async ({ page }, info) => {
  const response = await page.request.post('/api/register', {
    headers: { Origin: origin },
    data: { name: 'Gia đình mới', email: `seed-${Date.now()}-${info.project.name}@example.test`, password: 'Journey-seed-test-12345' },
  });
  expect(response.status()).toBe(200);
  await page.goto('/');
  const seed = page.locator('[data-journey-state="no-profile"]');
  await expect(seed.locator('.opportunity-tree')).toBeVisible();
  await expect(seed.locator('.tree-flower')).toHaveCount(0);
  const mobile = page.locator('.project-mobile-nav');
  const navigation = await mobile.isVisible() ? mobile : page.locator('.project-desktop-nav');
  const link = navigation.locator('[data-page="journey"]');
  await link.locator('xpath=ancestor::details[1]').locator('summary').click();
  await link.click();
  await expect(page.getByRole('heading', { name: 'Hành trình giá trị', exact: true })).toBeVisible();
  await expect(seed.locator('.opportunity-tree')).toBeVisible();
  expect((await (await page.request.get('/api/residents')).json())).toEqual([]);
  expect((await (await page.request.get('/api/bookings')).json())).toEqual([]);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(seed).toContainText('A journey is taking root');
  await expect(seed.locator('.opportunity-tree')).toBeVisible();
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await seed.screenshot({ path: `screenshots/journey-seed-${info.project.name}.png` });
  await seed.getByRole('button', { name: 'Tạo hồ sơ người học', exact: true }).click();
  await page.locator('#record-form [name="name"]').fill('Người học mới');
  await page.locator('#record-form [name="dob"]').fill('1960-01-01');
  await page.locator('#record-form [type="submit"]').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(seed).toHaveCount(0);
  await expect(page.locator('.personal-journey .opportunity-tree')).toBeVisible();
  await expect(page.locator('.personal-journey .tree-flower')).toHaveCount(0);
});

test("personal trees follow immutable bookings and never mix learner achievements", async ({ page, playwright }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    const login = await admin.post("/api/login", { headers: { Origin: origin }, data: { email: "admin@e2e.test", password: "Admin-e2e-test-12345" } });
    expect(login.status()).toBe(200);
    const adminHeaders = { Origin: origin, "X-CSRF-Token": (await login.json()).csrf };
    const suffix = `${Date.now()}-${info.project.name}`;
    const registration = await page.request.post("/api/register", { headers: { Origin: origin }, data: { name: "Gia đình thử cây", email: `trees-${suffix}@example.test`, password: "Journey-test-12345" } });
    expect(registration.status()).toBe(200);
    const headers = { Origin: origin, "X-CSRF-Token": (await registration.json()).csrf };
    async function create(kind, data) {
      const response = await page.request.post(`/api/${kind}`, { headers, data });
      expect(response.status()).toBe(200);
      return response.json();
    }
    const first = await create("residents", { name: "Bác An học cây", dob: "1960-01-01" });
    const second = await create("residents", { name: "Bác Bình học gốm", dob: "1958-01-01" });
    const packages = await (await page.request.get("/api/packages")).json();
    const today = new Date().toLocaleDateString("en-CA");
    const bookings = {};
    for (const tier of ["day", "week", "month"]) bookings[tier] = await create("bookings", { resident: first.id, package_id: packages.find(p => p.health_tier === tier).id, start: today, duration: 1 });
    const cancelled = await create("bookings", { resident: first.id, package_id: packages.find(p => p.health_tier === "month").id, start: today, duration: 1 });
    expect((await page.request.patch(`/api/bookings/${cancelled.id}`, { headers, data: { status: "Đã hủy" } })).status()).toBe(200);
    await create("bookings", { resident: second.id, package_id: packages.find(p => p.health_tier === "day").id, start: today, duration: 1 });
    await create("products", { resident: first.id, name: "Chậu húng quế của bác An", description: "Tự chăm cây sau buổi học", quantity: 1, unit: "chậu", public_consent: false });
    await create("products", { resident: second.id, name: "Bình gốm của bác Bình", description: "Thực hành tạo hình", quantity: 1, unit: "bình", public_consent: false });
    await create("practice", { resident: first.id, title: "Tưới cây vừa đủ", date: today, notes: "Thử tưới từng ít nước", result: "Đất đủ ẩm" });
    await create("gardens", { resident: first.id, name: "Góc vườn bác An", focus: "Húng quế", story: "Tôi muốn chỉ cháu cách chăm cây.", public_consent: false });
    // A catalog edit after purchase must not redraw a Day registration as Month.
    const dayPlan = packages.find(p => p.health_tier === "day");
    const changed = await admin.patch(`/api/packages/${dayPlan.id}`, { headers: adminHeaders, data: { health_tier: "month" } });
    expect(changed.status()).toBe(200);
    try {
      await page.goto("/");
      await page.locator("#dashboard-resident").selectOption(first.id);
      await expect(page.locator(".dashboard-signature")).toContainText("An tâm sống.");
      const fontReady = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('32px "Dancing Script"', 'An tâm sống. Tiếp tục học. Sẻ chia giá trị.'); });
      expect(fontReady).toBe(true);
      await expect(page.locator(".journey-package-tree")).toHaveCount(3);
      expect(await page.locator(".tree-opportunity-legend").first().evaluate(el => getComputedStyle(el).listStyleType)).toBe("decimal");
      for (const [tier, count] of [["day", 1], ["week", 2], ["month", 3]]) {
        const tree = page.locator(`[data-booking="${bookings[tier].id}"]`);
        await expect(tree).toHaveAttribute("data-tier", tier);
        await expect(tree.locator(".tree-flower")).toHaveCount(count);
        await expect(tree).toContainText("Đăng ký đang chờ đội ngũ xác nhận.");
      }
      await expect(page.locator(`[data-booking="${cancelled.id}"]`)).toHaveCount(0);
      await expect(page.locator(".personal-takeaways")).toContainText("Chậu húng quế của bác An");
      await expect(page.locator(".personal-takeaways")).not.toContainText("Bình gốm của bác Bình");
      await expect(page.locator(".personal-journey-stages")).toContainText("Tưới cây vừa đủ");
      await expect(page.locator(".personal-journey-stages li").last()).not.toContainText("Chậu húng quế của bác An");
      await page.screenshot({ path: `screenshots/value-journey-${info.project.name}.png`, fullPage: true });
      await page.locator("#dashboard-resident").selectOption(second.id);
      await expect(page.locator(".journey-package-tree")).toHaveCount(1);
      await expect(page.locator(".personal-takeaways")).toContainText("Bình gốm của bác Bình");
      await expect(page.locator(".personal-takeaways")).not.toContainText("Chậu húng quế của bác An");
      await page.getByRole("button", { name: "English", exact: true }).click();
      await expect(page.locator(".dashboard-signature")).toContainText("Keep learning.");
      await expect(page.locator(".personal-takeaways")).toContainText("What your loved one takes home");
      await page.reload();
      await expect(page.locator(".dashboard-signature")).toContainText("Keep learning.");
      await expect(page.locator(".journey-package-tree")).not.toHaveCount(0);
      await page.setViewportSize({ width: 320, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      expect((await admin.patch(`/api/packages/${dayPlan.id}`, { headers: adminHeaders, data: { health_tier: "day" } })).status()).toBe(200);
    }
  } finally { await admin.dispose(); }
});
