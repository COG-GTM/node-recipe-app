const { test, expect } = require('@playwright/test')

test('creates and edits a recipe description', async ({ page }) => {
	const title = `E2E Recipe ${Date.now()}`
	const description = 'An end-to-end tested description'
	const updatedDescription = 'An updated end-to-end description'

	await page.goto('/recipes')
	await page.click('text=Add New Recipe')

	await page.fill('#title', title)
	await page.fill('#description', description)
	await page.fill('#ingredients', 'Ingredient one\nIngredient two')
	await page.fill('#method', 'Step one\nStep two')
	await page.click('#add-recipe-form button[type="submit"]')

	await page.click(`a:has-text("${title}")`)
	await expect(page.locator('#recipe-description')).toHaveText(description)

	await page.click('text=Edit Recipe')
	await page.fill('#edit-description', updatedDescription)
	await page.click('#edit-recipe-form button[type="submit"]')

	await expect(page.locator('#recipe-description')).toHaveText(updatedDescription)
})
