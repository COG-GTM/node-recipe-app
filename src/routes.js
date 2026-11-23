const express = require('express')
const recipes = require('./database/recipeRepository')

const router = express.Router()

router.get('/', (req, res) => {
	res.render('home', { title: 'Recipe App' })
})

router.get('/recipes', async (req, res) => {
	const query = (req.query.q || '').trim()
	const results = query ? await recipes.searchRecipes(query) : await recipes.listRecipes()
	res.render('recipes', { recipes: results, query })
})

router.get('/recipes/:id', async (req, res) => {
	const recipe = await recipes.getRecipe(req.params.id)
	const averageRating = await recipes.getAverageRating(req.params.id)
	res.render('recipe', { recipe, averageRating })
})

router.post('/recipes', async (req, res) => {
	await recipes.createRecipe(req.body)
	res.redirect('/recipes')
})

router.post('/recipes/:id/edit', async (req, res) => {
	const recipeId = req.params.id
	await recipes.updateRecipe(recipeId, req.body)
	res.redirect(`/recipes/${recipeId}`)
})

router.post('/recipes/:id/rate', async (req, res) => {
	const recipeId = req.params.id
	const stars = Number(req.body.stars)
	if (stars < 1 && stars > 5) {
		return res.status(400).send('Rating must be between 1 and 5')
	}
	await recipes.addRating(recipeId, stars)
	res.redirect(`/recipes/${recipeId}`)
})

router.get('/recipes/:id/delete', async (req, res) => {
	await recipes.deleteRecipe(req.params.id)
	res.redirect('/recipes')
})

module.exports = router
