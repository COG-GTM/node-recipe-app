const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

async function getTestDbConnection() {
	return open({
		filename: './test-database.sqlite',
		driver: sqlite3.Database,
	})
}

async function initializeTestDb() {
	const db = await getTestDbConnection()
	await createTables(db)
	return db
}

async function createTables(db) {
	// Create the 'recipes' table to store recipe information
	await db.exec(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    ingredients TEXT,
    method TEXT
  )`)

	await db.exec(`CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    recipe_id INTEGER NOT NULL,
    stars INTEGER NOT NULL
  )`)
}

module.exports = { getTestDbConnection, initializeTestDb }
