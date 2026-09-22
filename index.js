const express = require('express')
const exphbs = require('express-handlebars')
const { initializeDb } = require('./src/database')
const routes = require('./src/routes')
const { createRateLimiter } = require('./src/rateLimiter')

const app = express()
const PORT = process.env.PORT || 3000

if (process.env.TRUST_PROXY) {
	const value = process.env.TRUST_PROXY
	const parsed = /^\d+$/.test(value) ? Number(value) : value === 'true' ? true : value === 'false' ? false : value
	app.set('trust proxy', parsed)
}

app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use(createRateLimiter())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

app.engine(
	'hbs',
	exphbs.engine({
		extname: '.hbs',
		defaultLayout: 'main',
		layoutsDir: './views/layouts',
		helpers: {
			truncate: function (str, len) {
				if (str && str.length > len) {
					return str.substring(0, len) + '...'
				}
				return str
			},
			split: function (str, delimiter) {
				if (str) {
					// Handle different types of newlines and normalize them
					const normalizedStr = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
					const result = normalizedStr.split(delimiter).filter(item => item.trim() !== '')
					return result
				}
				return []
			},
			add: function (a, b) {
				return a + b
			},
			newline: function() {
				return '\n'
			}
		},
	})
)
app.set('view engine', 'hbs')
app.set('views', './views')
initializeDb().catch(console.error)

app.use('/', routes)

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
