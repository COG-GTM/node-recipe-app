const express = require('express')
const { getDbConnection } = require('./database')

const router = express.Router()

const MAX_DESCRIPTION_LENGTH = 300

function isDescriptionTooLong(description) {
	return typeof description === 'string' && description.length > MAX_DESCRIPTION_LENGTH
}

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
	res.render('recipe', { recipe })
})

router.post('/recipes', async (req, res) => {
	const db = await getDbConnection()
	const { title, description, ingredients, method } = req.body
	if (isDescriptionTooLong(description)) {
		return res.status(400).send(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
	}
	await db.run('INSERT INTO recipes (title, description, ingredients, method) VALUES (?, ?, ?, ?)', [
		title,
		description,
		ingredients,
		method,
	])
	res.redirect('/recipes')
})

router.post('/recipes/:id/edit', async (req, res) => {
	const db = await getDbConnection()
	const recipeId = req.params.id
	const { title, description, ingredients, method } = req.body
	if (isDescriptionTooLong(description)) {
		return res.status(400).send(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`)
	}
	await db.run('UPDATE recipes SET title = ?, description = ?, ingredients = ?, method = ? WHERE id = ?', [
		title,
		description,
		ingredients,
		method,
		recipeId,
	])
	res.redirect(`/recipes/${recipeId}`)
})

module.exports = router
