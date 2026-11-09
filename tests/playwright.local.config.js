const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: 'local.spec.js',
  use: { baseURL: 'http://localhost:5174' },
});
