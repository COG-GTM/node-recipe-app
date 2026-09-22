const DEFAULTS = {
	rateLimitAnonPerMinute: 60,
	rateLimitAuthPerMinute: 600,
}

function parsePositiveInt(value, fallback) {
	if (value === undefined || value === null || value === '') return fallback
	const parsed = Number(value)
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer, got "${value}"`)
	}
	return parsed
}

function parseList(value) {
	return (value || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

function parseTrustProxy(value) {
	if (value === undefined || value === '') return false
	if (value === 'true') return true
	if (value === 'false') return false
	if (/^\d+$/.test(value)) return Number(value)
	return value
}

function loadConfig(env = process.env) {
	return {
		port: env.PORT || 3000,
		trustProxy: parseTrustProxy(env.TRUST_PROXY),
		apiKeys: new Set(parseList(env.API_KEYS)),
		rateLimitAnonPerMinute: parsePositiveInt(env.RATE_LIMIT_ANON_PER_MINUTE, DEFAULTS.rateLimitAnonPerMinute),
		rateLimitAuthPerMinute: parsePositiveInt(env.RATE_LIMIT_AUTH_PER_MINUTE, DEFAULTS.rateLimitAuthPerMinute),
	}
}

module.exports = { loadConfig, DEFAULTS }
