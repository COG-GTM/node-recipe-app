function countIngredients(ingredients) {
	if (!ingredients) {
		return 0
	}
	return String(ingredients)
		.split(/\r\n|\r|\n/)
		.filter(line => line.trim() !== '').length
}

function formatIngredientCount(count) {
	return `${count} ${count === 1 ? 'ingredient' : 'ingredients'}`
}

module.exports = { countIngredients, formatIngredientCount }
