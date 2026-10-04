const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:8123", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "python tests/e2e_server.py",
    url: "http://127.0.0.1:8123",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
