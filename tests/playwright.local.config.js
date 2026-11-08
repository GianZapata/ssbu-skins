const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: 'local.spec.js',
  use: { baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command: 'python3 -m http.server 5174 --bind 127.0.0.1',
    cwd: '../_site',
    port: 5174,
    reuseExistingServer: !process.env.CI,
  },
});
