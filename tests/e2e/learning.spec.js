const { test, expect } = require("@playwright/test");

test("senior learns for free, shares an approved portfolio and books a garden visit", async ({ page, playwright }, info) => {
  const origin = "http://127.0.0.1:8123";
  const admin = await playwright.request.newContext({ baseURL: origin });
  try {
    const login = await admin.post("/api/login", { headers: { Origin: origin }, data: { email: "admin@e2e.test", password: "Admin-e2e-test-12345" } });
    expect(login.status()).toBe(200);
    const adminData = await login.json();
    const adminHeaders = { Origin: origin, "X-CSRF-Token": adminData.csrf };
    const suffix = `${Date.now()}-${info.project.name}`;
    const workshopResponse = await admin.post("/api/activities", { headers: adminHeaders, data: { name: `Vườn rau ${suffix}`, date: new Date().toLocaleDateString("en-CA"), time: "09:00", topic: "Nông nghiệp", format: "Workshop", fitness: "Nhẹ nhàng", location: "Vườn thực hành", capacity: 2, active: true } });
    expect(workshopResponse.status()).toBe(200);
    const workshop = await workshopResponse.json();

    await page.goto("/");
    await page.screenshot({ path: `screenshots/learning-home-${info.project.name}.png`, fullPage: true });
    await page.getByRole("button", { name: "Đăng ký học viên cao tuổi", exact: true }).click();
    await page.locator('#auth-form input[name="name"]').fill("Học viên kiểm thử");
    await page.locator('#auth-form input[name="email"]').fill(`senior-${suffix}@example.test`);
    await page.locator('#auth-form input[name="password"]').fill("Senior-test-12345");
    await page.locator('#auth-form button[type="submit"]').click();
    await expect(page.getByRole("heading", { name: "Học mỗi ngày. Tạo giá trị mỗi ngày." })).toBeVisible();
    await page.getByRole("button", { name: "Nghệ nhân bạc", exact: true }).click();
    await page.locator('nav [data-id="workshops"]').click();
    await page.screenshot({ path: `screenshots/learning-workshops-${info.project.name}.png`, fullPage: true });
    const card = page.locator(".learning-workshop").filter({ hasText: workshop.name });
    await card.getByRole("button", { name: "Đăng ký miễn phí", exact: true }).click();
    await page.locator('#record-form input[name="name"]').fill("Học viên vườn rau");
    await page.locator('#record-form input[name="dob"]').fill("1955-01-01");
    await expect(page.locator(".learning-health-fields")).not.toHaveAttribute("open", "");
    await page.locator('#record-form button[type="submit"]').click();
    await expect(page.locator('#record-form select[name="activity_id"]')).toHaveValue(workshop.id);
    await page.locator('#record-form button[type="submit"]').click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const me = await (await page.context().request.get(origin + "/api/me")).json();
    expect(me.user.role).toBe("SENIOR");
    const headers = { Origin: origin, "X-CSRF-Token": me.csrf };
    const profiles = await (await page.context().request.get(origin + "/api/residents")).json();
    const resident = profiles[0];
    const gardenResponse = await page.context().request.post(origin + "/api/gardens", { headers, data: { resident: resident.id, name: `Nghệ nhân ${suffix}`, focus: "Rau hữu cơ", story: "Từ buổi học đầu tiên đến chậu rau của tôi", public_consent: true } });
    expect(gardenResponse.status()).toBe(200);
    const garden = await gardenResponse.json();
    const productResponse = await page.context().request.post(origin + "/api/products", { headers, data: { resident: resident.id, name: `Chậu rau ${suffix}`, description: "Thành quả từ thực hành tại vườn", quantity: 1, unit: "chậu", public_consent: true } });
    const product = await productResponse.json();
    expect(productResponse.status()).toBe(200);
    const practiceResponse = await page.context().request.post(origin + "/api/practice", { headers, data: { resident: resident.id, title: "Gieo hạt", date: workshop.date, notes: "Chuẩn bị đất và gieo hạt", result: "Một chậu rau mới" } });
    expect(practiceResponse.status()).toBe(200);
    for (const [kind, record] of [["gardens", garden], ["products", product]]) {
      const approval = await admin.patch(`/api/${kind}/${record.id}`, { headers: adminHeaders, data: { publication: "Đã duyệt" } });
      expect(approval.status()).toBe(200);
    }
    await page.getByRole("button", { name: "Nghệ nhân bạc", exact: true }).click();
    const artist = page.locator(".learning-artisan").filter({ hasText: `Nghệ nhân ${suffix}` });
    await expect(artist.getByText(`Chậu rau ${suffix}`, { exact: true })).toBeVisible();
    await artist.getByRole("button", { name: "Đặt tham quan vườn", exact: true }).click();
    await page.locator('#record-form input[name="guests"]').fill("2");
    await page.locator('#record-form button[type="submit"]').click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const tours = await (await page.context().request.get(origin + "/api/tour_bookings")).json();
    expect(tours[0].status).toBe("Chờ duyệt");
    expect(tours[0].guests).toBe(2);
    await page.getByRole("button", { name: "Nghệ nhân bạc", exact: true }).click();
    await expect(page.locator(".learning-artisan").filter({ hasText: `Nghệ nhân ${suffix}` })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `screenshots/learning-${info.project.name}.png`, fullPage: true });
  } finally {
    await admin.dispose();
  }
});
