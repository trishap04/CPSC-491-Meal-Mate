const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5500',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'Tablet',
      use: {
        browserName: 'chromium',
        ...devices['iPad (gen 7)']
      }
    },
    {
      name: 'Mobile Chrome',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 7']
      }
    },
    {
      name: 'Firefox Desktop',
      use: {
        browserName: 'firefox',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'Safari Desktop',
      use: {
        browserName: 'webkit',
        viewport: { width: 1440, height: 900 }
      }
    }
  ],
  webServer: {
    command: 'python3 -m http.server 5500',
    port: 5500,
    reuseExistingServer: true
  }
});
