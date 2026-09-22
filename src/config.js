const DEFAULTS = {
	anonymousLimit: 60,
	authenticatedLimit: 600,
	windowMs: 60 * 1000,
}

function parsePositiveInt(value, fallback) {
	if (value === undefined || value === null || value === '') return fallback
	const parsed = Number.parseInt(value, 10)
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer, got "${value}"`)
	}
	return parsed
}

function getRateLimitConfig(env = process.env) {
	return {
		anonymousLimit: parsePositiveInt(env.RATE_LIMIT_ANON_PER_MINUTE, DEFAULTS.anonymousLimit),
		authenticatedLimit: parsePositiveInt(env.RATE_LIMIT_AUTH_PER_MINUTE, DEFAULTS.authenticatedLimit),
		windowMs: DEFAULTS.windowMs,
	}
}

module.exports = { DEFAULTS, getRateLimitConfig }
