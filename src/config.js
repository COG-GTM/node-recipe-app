const DEFAULTS = {
	rateLimitAnonPerMinute: 60,
	rateLimitAuthPerMinute: 600,
}

function parsePositiveInt(value, fallback) {
	if (value === undefined || value === null || value === '') return fallback
	const parsed = Number.parseInt(value, 10)
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer, got "${value}"`)
	}
	return parsed
}

function loadConfig(env = process.env) {
	return {
		port: env.PORT || 3000,
		rateLimitAnonPerMinute: parsePositiveInt(env.RATE_LIMIT_ANON_PER_MINUTE, DEFAULTS.rateLimitAnonPerMinute),
		rateLimitAuthPerMinute: parsePositiveInt(env.RATE_LIMIT_AUTH_PER_MINUTE, DEFAULTS.rateLimitAuthPerMinute),
	}
}

module.exports = { loadConfig, DEFAULTS }
