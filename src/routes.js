const express = require('express')
const { getDbConnection } = require('./database')

const router = express.Router()

router.get('/', (req, res) => {
	res.render('home', { title: 'Recipe App' })
})

router.get('/recipes', async (req, res) => {
	const db = await getDbConnection()
	const recipes = await db.all('SELECT * FROM recipes')
	res.render('recipes', { recipes })
})

router.get('/recipes/:id', async (req, res) => {
	const db = await getDbConnection()
	const recipeId = req.params.id
	const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [recipeId])
	if (!recipe) {
		return res.status(404).render('recipe', { recipe: null })
	}
	res.render('recipe', { recipe })
})

router.post('/recipes', async (req, res) => {
	const db = await getDbConnection()
	const { title, ingredients, method } = req.body
	if (typeof title !== 'string' || !title.trim()) {
		const recipes = await db.all('SELECT * FROM recipes')
		return res.status(400).render('recipes', { recipes, error: 'Recipe title is required.', formValues: req.body })
	}
	await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', [title.trim(), ingredients, method])
	res.redirect('/recipes')
})

router.post('/recipes/:id/edit', async (req, res) => {
	const db = await getDbConnection()
	const recipeId = req.params.id
	const { title, ingredients, method } = req.body
	const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [recipeId])
	if (!recipe) {
		return res.status(404).render('recipe', { recipe: null })
	}
	if (typeof title !== 'string' || !title.trim()) {
		return res.status(400).render('recipe', { recipe, error: 'Recipe title is required.', formValues: req.body })
	}
	await db.run('UPDATE recipes SET title = ?, ingredients = ?, method = ? WHERE id = ?', [
		title.trim(),
		ingredients,
		method,
		recipeId,
	])
	res.redirect(`/recipes/${recipeId}`)
})

module.exports = router
