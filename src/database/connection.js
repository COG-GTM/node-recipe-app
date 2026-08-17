const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

async function getDbConnection() {
	return open({
		filename: process.env.DATABASE_FILE || './database.sqlite',
		driver: sqlite3.Database,
	})
}

module.exports = { getDbConnection }
