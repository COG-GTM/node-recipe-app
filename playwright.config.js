const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
	testDir: './e2e',
	timeout: 30000,
	use: {
		baseURL: 'http://localhost:3000',
		video: 'on',
		trace: 'on',
	},
	webServer: {
		command: 'npm start',
		url: 'http://localhost:3000/recipes',
		reuseExistingServer: !process.env.CI,
		timeout: 60000,
	},
})
