const DEFAULTS = {
	anonymousLimit: 60,
	authenticatedLimit: 600,
	windowMs: 60 * 1000,
}

function parsePositiveInt(value, fallback) {
	if (value === undefined || value === null || value === '') return fallback
	const parsed = Number(value)
	if (!/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(parsed) || parsed <= 0) {
		throw new Error(`Expected a positive integer, got "${value}"`)
	}
	return parsed
}

function parseKeyList(value) {
	if (!value) return null
	const keys = value.split(',').map((k) => k.trim()).filter(Boolean)
	return keys.length ? new Set(keys) : null
}

function getRateLimitConfig(env = process.env) {
	return {
		apiKeys: parseKeyList(env.RATE_LIMIT_API_KEYS),
		anonymousLimit: parsePositiveInt(env.RATE_LIMIT_ANON_PER_MINUTE, DEFAULTS.anonymousLimit),
		authenticatedLimit: parsePositiveInt(env.RATE_LIMIT_AUTH_PER_MINUTE, DEFAULTS.authenticatedLimit),
		windowMs: DEFAULTS.windowMs,
	}
}

module.exports = { DEFAULTS, getRateLimitConfig }
