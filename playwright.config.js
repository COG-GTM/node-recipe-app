const { defineConfig, devices } = require('@playwright/test')

const PORT = process.env.E2E_PORT || 3100
const baseURL = `http://127.0.0.1:${PORT}`

module.exports = defineConfig({
	testDir: './e2e',
	reporter: [['list']],
	use: {
		baseURL,
		video: 'on',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `node index.js`,
		url: baseURL,
		env: { PORT: String(PORT) },
		reuseExistingServer: !process.env.CI,
		timeout: 60000,
	},
})
