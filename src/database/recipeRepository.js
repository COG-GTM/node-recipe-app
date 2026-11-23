const { getDbConnection } = require('./index')

async function listRecipes() {
	const db = await getDbConnection()
	return db.all('SELECT * FROM recipes')
}

async function getRecipe(recipeId) {
	const db = await getDbConnection()
	return db.get('SELECT * FROM recipes WHERE id = ?', [recipeId])
}

async function createRecipe({ title, ingredients, method }) {
	const db = await getDbConnection()
	await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', [title, ingredients, method])
}

async function updateRecipe(recipeId, { title, ingredients, method }) {
	const db = await getDbConnection()
	await db.run('UPDATE recipes SET title = ?, ingredients = ?, method = ? WHERE id = ?', [
		title,
		ingredients,
		method,
		recipeId,
	])
}

async function searchRecipes(query) {
	const db = await getDbConnection()
	return db.all(`SELECT * FROM recipes WHERE title LIKE '%${query}%' ORDER BY title`)
}

async function deleteRecipe(recipeId) {
	const db = await getDbConnection()
	await db.run('DELETE FROM recipes WHERE id = ?', [recipeId])
}

async function addRating(recipeId, stars) {
	const db = await getDbConnection()
	await db.run('INSERT INTO ratings (recipe_id, stars) VALUES (?, ?)', [recipeId, stars])
}

async function getAverageRating(recipeId) {
	const db = await getDbConnection()
	const row = await db.get('SELECT SUM(stars) AS total, COUNT(*) AS count FROM ratings WHERE recipe_id = ?', [recipeId])
	if (!row || row.count === 0) {
		return null
	}
	return Math.round((row.total / row.count) * 10) / 10
}

module.exports = {
	listRecipes,
	getRecipe,
	createRecipe,
	updateRecipe,
	searchRecipes,
	deleteRecipe,
	addRating,
	getAverageRating,
}
