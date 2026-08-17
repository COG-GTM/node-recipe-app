const { test, expect } = require('@playwright/test')

test('creates and edits a recipe description', async ({ page }) => {
	const title = `E2E Recipe ${Date.now()}`
	const description = 'A hearty one-pot dinner that comes together in under 30 minutes.'
	const updatedDescription = 'Updated: a hearty one-pot dinner, now with extra garlic.'

	await page.goto('/recipes')
	await page.getByRole('button', { name: 'Add New Recipe' }).click()

	await page.fill('#title', title)
	await page.fill('#description', description)
	await page.fill('#ingredients', 'Garlic\nOlive oil\nTomatoes')
	await page.fill('#method', 'Chop the garlic\nFry everything\nServe hot')
	await page.getByRole('button', { name: 'Add Recipe' }).click()

	await expect(page).toHaveURL(/\/recipes$/)
	await page.getByRole('link', { name: title }).click()

	await expect(page.locator('#recipe-description')).toHaveText(description)

	await page.getByRole('button', { name: 'Edit Recipe' }).click()
	await page.fill('#edit-description', updatedDescription)
	await page.getByRole('button', { name: 'Update Recipe' }).click()

	await expect(page.locator('#recipe-description')).toHaveText(updatedDescription)
})
