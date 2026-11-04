const express = require('express')
const { getDbConnection } = require('./database')

const router = express.Router()

router.get('/', (req, res) => {
	res.render('home', { title: 'Recipe App' })
})

router.get('/recipes', async (req, res) => {
	const db = await getDbConnection()
	const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
	if (!query) {
		const recipes = await db.all('SELECT * FROM recipes')
		return res.render('recipes', { recipes })
	}
	const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`
	const recipes = await db.all(
		"SELECT * FROM recipes WHERE title LIKE ? ESCAPE '\\' OR ingredients LIKE ? ESCAPE '\\'",
		[pattern, pattern]
	)
	res.render('recipes', { recipes, query })
})

router.get('/recipes/random', async (req, res) => {
	const db = await getDbConnection()
	const recipe = await db.get('SELECT id FROM recipes ORDER BY RANDOM() LIMIT 1')
	res.redirect(recipe ? `/recipes/${recipe.id}` : '/recipes')
})

router.get('/recipes/:id', async (req, res) => {
	const db = await getDbConnection()
	const recipeId = req.params.id
	const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [recipeId])
	res.render('recipe', { recipe })
})

router.post('/recipes', async (req, res) => {
	const db = await getDbConnection()
	const { title, ingredients, method } = req.body
	await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', [title, ingredients, method])
	res.redirect('/recipes')
})

router.post('/recipes/:id/edit', async (req, res) => {
	const db = await getDbConnection()
	const recipeId = req.params.id
	const { title, ingredients, method } = req.body
	await db.run('UPDATE recipes SET title = ?, ingredients = ?, method = ? WHERE id = ?', [
		title,
		ingredients,
		method,
		recipeId,
	])
	res.redirect(`/recipes/${recipeId}`)
})

module.exports = router
