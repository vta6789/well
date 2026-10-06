const { test, expect } = require("@playwright/test");

test("admin has a dedicated workspace and receives family requests", async ({ page, request }, info) => {
  const suffix = `${Date.now()}-${info.project.name}`;
  const registration = await request.post("/api/register", {
    headers: { Origin: "http://127.0.0.1:8123" },
    data: { name: "Family admin test", email: `admin-family-${suffix}@example.test`, password: "Family-test-12345" },
  });
  expect(registration.status()).toBe(200);
  const family = await registration.json();
  const headers = { Origin: "http://127.0.0.1:8123", "X-CSRF-Token": family.csrf };
  const residentResponse = await request.post("/api/residents", {
    headers, data: { name: "Resident admin test", dob: "1950-01-01", phone: "0900123456", consent: true },
  });
  expect(residentResponse.status()).toBe(200);
  const resident = await residentResponse.json();
  const familyRequest = await request.post("/api/requests", {
    headers, data: { resident: resident.id, title: `Yêu cầu kiểm thử ${suffix}` },
  });
  expect(familyRequest.status()).toBe(200);

  await page.goto("/");
  await page.locator("#navAuthArea").getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.locator("#auth-form input[name=email]").fill("admin@e2e.test");
  await page.locator("#auth-form input[name=password]").fill("Admin-e2e-test-12345");
  await page.locator('#auth-form button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Quản trị hệ thống", exact: true })).toBeVisible();
  await expect(page.locator(".admin-portal")).toBeVisible();
  await expect(page.locator(".project-desktop-nav")).toHaveCount(0);
  await expect(page.locator(".admin-portal footer")).toHaveCount(0);
  await expect(page.locator("#main").getByText(`Yêu cầu kiểm thử ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.locator("#main").getByText(family.user.email, { exact: true })).toBeVisible();

  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Mở menu quản trị", exact: true }).click();
    await expect(page.locator("#sidebar")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#sidebar")).not.toHaveClass(/open/);
    await page.getByRole("button", { name: "Mở menu quản trị", exact: true }).click();
  }
  await page.locator("#sidebar").getByRole("button", { name: "Yêu cầu gia đình", exact: true }).click();
  await expect(page.locator("#main").getByRole("heading", { name: "Yêu cầu gia đình", exact: true })).toBeVisible();
  await expect(page.locator("#main").getByText(`Yêu cầu kiểm thử ${suffix}`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".admin-portal")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `screenshots/admin-${info.project.name}.png`, fullPage: false });
});
const { failPublicApi } = require("./mock-api");

async function openFunctions(page, title) {
  const mobile = page.locator(".project-mobile-nav");
  const menu = (await mobile.isVisible())
    ? mobile
    : page
        .locator(".project-function-menu")
        .filter({ has: page.locator("summary").filter({ hasText: title }) });
  await menu.locator("summary").click();
  return menu;
}

test("API failure presents a useful error instead of a blank page", async ({
  page,
}) => {
  await failPublicApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Chưa kết nối được máy chủ" }),
  ).toBeVisible();
  await expect(page.getByText("Máy chủ đang bảo trì")).toBeVisible();
});

test("local assets and public navigation", async ({ page }) => {
  const external = [],
    errors = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:8123/"))
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".learning-hero")).toBeVisible();
  await expect(page.locator("img")).toHaveJSProperty("complete", true);
  expect(
    await page.locator("img").evaluate((img) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.locator('nav [data-id="workshops"]').click();
  await expect(page.getByRole("heading", { name: "Lịch workshop và talkshow" })).toBeVisible();
  await page.locator('nav [data-id="artisans"]').click();
  await expect(page.getByRole("heading", { name: "Nghệ nhân bạc và sản phẩm của họ" })).toBeVisible();
  await page.locator('nav [data-id="packages"]').click();
  await expect(page.getByRole("heading", { name: "Chọn hành trình trải nghiệm của bạn" })).toBeVisible();
  await expect(page.locator(".learning-package")).toHaveCount(3);
  await expect(page.getByText("Miễn phí", { exact: true })).toHaveCount(3);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("modal traps keyboard focus, closes with Escape and restores trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page
    .locator("#navAuthArea")
    .getByRole("button", { name: "Đăng nhập", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#modal-title")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Đóng", exact: true }),
  ).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("registration, settings and logout use the real backend", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .locator("#navAuthArea")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const suffix = `${Date.now()}${info.project.name === "mobile" ? "1" : "2"}`;
  await dialog.getByLabel("Họ tên").fill("Gia đình kiểm thử");
  await dialog
    .getByLabel("Email", { exact: false })
    .fill(`family-${suffix}@example.test`);
  await expect(dialog.getByLabel("Số điện thoại")).toHaveCount(0);
  await dialog.getByLabel("Mật khẩu").fill("Wellness-test-12345");
  await dialog.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".project-app-header")).toBeVisible();
  const functions = await openFunctions(page, "Lưu trú");
  await functions
    .getByRole("button", { name: "Lưu trú của tôi", exact: true })
    .click();
  await page.locator(".project-user-menu summary").click();
  const font = page.getByRole("button", { name: "Cỡ chữ Aᴀ" });
  await font.click();
  await expect(font).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(/large-text/);
  await page.reload();
  await page.locator(".project-user-menu summary").click();
  await expect(page.getByRole("button", { name: "Cỡ chữ Aᴀ" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Về dự án", exact: true }).click();
  await expect(
    page.locator("#main").getByRole("heading", { name: "Tác giả" }),
  ).toBeVisible();
  await page.locator(".project-user-menu summary").click();
  await page
    .getByRole("button", { name: "Cài đặt & bảo mật", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cài đặt & bảo mật" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/large-text/);
  await page.locator(".project-user-menu summary").click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page
      .locator("#navAuthArea")
      .getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});

const roles = [
  ["FAMILY", "Lưu trú", "bookings", "Lưu trú của tôi"],
  ["RECEPTION", "Lưu trú", "rooms", "Phòng & sức chứa"],
  ["NURSE", "Chăm sóc", "care", "Kế hoạch chăm sóc"],
  ["DOCTOR", "Chăm sóc", "medications", "Thuốc & nhật ký dùng thuốc"],
  ["ACCOUNTANT", "Vận hành", "payments", "Thu chi & đối soát"],
  ["MANAGER", "Vận hành", "shifts", "Phân ca"],
  ["ADMIN", "Vận hành", "users", "Tài khoản & quyền"],
];
test("lodging links are removed and medication links share one care page", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const result = path === "/api/me"
      ? { user: { id: "test-user", name: "Nguyễn Minh An", email: "test@example.test", role: "NURSE" }, csrf: "test", demo: false }
      : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(result) });
  });
  await page.goto("/");
  const isMobile = await page.locator(".project-mobile-nav").isVisible();
  const nav = isMobile ? await openFunctions(page, "Lưu trú") : page.locator(".project-desktop-nav");
  const lodging = isMobile
    ? nav.locator(".project-mobile-panel section").nth(1)
    : nav.locator(".project-function-menu").filter({ has: page.locator("summary").filter({ hasText: "Lưu trú" }) });
  const care = isMobile
    ? nav.locator(".project-mobile-panel section").nth(2)
    : nav.locator(".project-function-menu").filter({ has: page.locator("summary").filter({ hasText: "Chăm sóc" }) });
  for (const removedPage of ["packages", "visits", "requests"])
    await expect(lodging.locator(`[data-page="${removedPage}"]`)).toHaveCount(0);
  for (const removedPage of ["vitals", "doses", "attachments"])
    await expect(care.locator(`[data-page="${removedPage}"]`)).toHaveCount(0);
  await expect(care.locator('[data-page="medications"]')).toHaveCount(1);

  const menu = isMobile ? nav : await openFunctions(page, "Chăm sóc");
  await menu.getByRole("button", { name: "Thuốc & nhật ký dùng thuốc" }).click();
  await expect(page.getByRole("heading", { name: "Thuốc & nhật ký dùng thuốc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thuốc & chỉ định" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Nhật ký dùng thuốc" }).click();
  await expect(page.getByRole("button", { name: "Nhật ký dùng thuốc" })).toHaveAttribute("aria-pressed", "true");
});

for (const [role, group, target, label] of roles) {
  test(`${role === "ADMIN" ? "administration" : "compact"} navigation remains usable for ${role}`, async ({
    page,
  }, info) => {
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const result =
        path === "/api/me"
          ? {
              user: {
                id: "test-user",
                name: "Nguyễn Minh An",
                email: "test@example.test",
                role,
              },
              csrf: "test",
              demo: false,
            }
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    });
    await page.goto("/");
    if (role === "ADMIN") {
      await expect(page.locator(".admin-header")).toBeVisible();
      await expect(page.locator(".project-app-header")).toHaveCount(0);
      if (info.project.name === "mobile")
        await page.getByRole("button", { name: "Mở menu quản trị", exact: true }).click();
      await page.locator("#sidebar").getByRole("button", { name: label, exact: true }).click();
      await expect(page.locator("#sidebar").locator(`[data-page="${target}"]`)).toHaveAttribute("aria-current", "page");
      await expect(page.locator("#main").getByRole("heading", { name: label, exact: true })).toBeVisible();
      await page.getByRole("button", { name: "+ Tạo tài khoản", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      return;
    }
    await expect(page.locator(".project-app-header")).toBeVisible();
    const header = page.locator(".project-app-header");
    expect(
      await header.locator(".project-function-menu").count(),
    ).toBeLessThanOrEqual(4);
    expect(
      await header.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(await header.locator("summary:visible").count()).toBeLessThanOrEqual(
      5,
    );
    expect(
      await page
        .locator("body")
        .evaluate((el) => el.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (role === "MANAGER") {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `test-results/navigation-${info.project.name}.png`,
      });
    }
    const menu = await openFunctions(page, group);
    await expect(
      menu.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
    if (role === "FAMILY")
      await expect(menu.locator('[data-page="users"]')).toHaveCount(0);
    await menu.getByRole("button", { name: label, exact: true }).click();
    expect(await header.locator("details[open]").count()).toBe(0);
    const currentMenu = await openFunctions(page, group);
    await expect(
      currentMenu.locator(`[data-page="${target}"]`),
    ).toHaveAttribute("aria-current", "page");
    await currentMenu.locator("summary").focus();
    await page.keyboard.press("Escape");
    await expect(currentMenu).not.toHaveAttribute("open", "");
    await expect(currentMenu.locator("summary")).toBeFocused();
    await openFunctions(page, group);
    await page.locator(".project-user-menu summary").click();
    await expect(page.locator(".project-app-header details[open]")).toHaveCount(
      1,
    );
    await page.mouse.click(8, info.project.use.viewport.height - 16);
    await expect(page.locator(".project-app-header details[open]")).toHaveCount(
      0,
    );
  });
}
