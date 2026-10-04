const { test, expect } = require("@playwright/test");
const { failPublicApi } = require("./mock-api");

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

test("local assets, navigation and persisted reading preference", async ({
  page,
}) => {
  const external = [],
    errors = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:8123/"))
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#sec-home")).toBeVisible();
  await expect(page.locator("img")).toHaveJSProperty("complete", true);
  expect(
    await page.locator("img").evaluate((img) => img.naturalWidth),
  ).toBeGreaterThan(0);
  const font = page.getByRole("button", { name: "Cỡ chữ Aᴀ" });
  const before = await page
    .locator("h1")
    .evaluate((el) => el.getBoundingClientRect().height);
  await font.click();
  await expect(font).toHaveAttribute("aria-pressed", "true");
  expect(
    await page
      .locator("h1")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThan(before);
  await page.reload();
  await expect(page.getByRole("button", { name: "Cỡ chữ Aᴀ" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .locator('[data-action="original-packages"]:visible')
    .first()
    .click();
  await expect(page.locator("#sec-packages")).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("modal traps keyboard focus, closes with Escape and restores trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Đăng Nhập / Đăng Ký" });
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
  await page.getByRole("button", { name: "Đăng Nhập / Đăng Ký" }).click();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const suffix = `${Date.now()}${info.project.name === "mobile" ? "1" : "2"}`;
  await dialog.getByLabel("Họ tên").fill("Gia đình kiểm thử");
  await dialog
    .getByLabel("Email", { exact: false })
    .fill(`family-${suffix}@example.test`);
  await dialog.getByLabel("Số điện thoại").fill(suffix.slice(-10));
  await dialog.getByLabel("Mật khẩu").fill("Wellness-test-12345");
  await dialog.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Không gian gia đình', exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Khôn", exact: false })
    .first()
    .click();
  await page.locator("#module-select").selectOption("settings");
  await expect(
    page.getByRole("heading", { name: "Cài đặt & bảo mật" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đổi cỡ chữ Aᴀ" }).click();
  await expect(page.locator("html")).toHaveClass(/large-text/);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("button", { name: "Đăng Nhập / Đăng Ký" }),
  ).toBeVisible();
});
