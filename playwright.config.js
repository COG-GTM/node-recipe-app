const { defineConfig, devices } = require('@playwright/test')

const PORT = process.env.E2E_PORT || 3100
const baseURL = `http://127.0.0.1:${PORT}`
const DATABASE_FILE = './e2e-database.sqlite'

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
		// Start from an empty database so tests never depend on prior runs.
		command: `node -e "require('fs').rmSync('${DATABASE_FILE}', { force: true })" && node index.js`,
		url: baseURL,
		env: { PORT: String(PORT), DATABASE_FILE },
		reuseExistingServer: false,
		timeout: 60000,
	},
})
