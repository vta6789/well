// Explicit network-failure fixture; business flows use the real backend.
async function failPublicApi(page) {
  await page.route("**/api/public", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Máy chủ đang bảo trì" }),
    }),
  );
}
module.exports = { failPublicApi };
