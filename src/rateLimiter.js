const { getRateLimitConfig } = require('./config')

function extractApiKeys(req) {
	const keys = []
	const headerKey = req.get('x-api-key')
	if (headerKey && headerKey.trim()) keys.push(headerKey.trim())
	const auth = req.get('authorization')
	if (auth && /^bearer\s+/i.test(auth)) {
		const bearer = auth.replace(/^bearer\s+/i, '').trim()
		if (bearer) keys.push(bearer)
	}
	return keys
}

function extractApiKey(req) {
	return extractApiKeys(req)[0] ?? null
}

class RateLimiter {
	constructor({ anonymousLimit, authenticatedLimit, windowMs, apiKeys, now = Date.now } = {}) {
		const config = getRateLimitConfig()
		this.anonymousLimit = anonymousLimit ?? config.anonymousLimit
		this.authenticatedLimit = authenticatedLimit ?? config.authenticatedLimit
		this.windowMs = windowMs ?? config.windowMs
		this.apiKeys = apiKeys === undefined ? config.apiKeys : apiKeys
		this.now = now
		this.buckets = new Map()
		this.nextPruneAt = 0
	}

	isAuthenticated(apiKey) {
		if (!apiKey) return false
		return this.apiKeys ? this.apiKeys.has(apiKey) : true
	}

	selectApiKey(candidates) {
		return candidates.find((k) => this.isAuthenticated(k)) ?? null
	}

	hit(key, limit) {
		const now = this.now()
		if (now >= this.nextPruneAt) {
			this.prune(now)
			this.nextPruneAt = now + this.windowMs
		}
		let bucket = this.buckets.get(key)
		if (!bucket || bucket.resetAt <= now) {
			bucket = { count: 0, resetAt: now + this.windowMs }
			this.buckets.set(key, bucket)
		}
		bucket.count += 1
		const allowed = bucket.count <= limit
		return {
			allowed,
			limit,
			remaining: Math.max(0, limit - bucket.count),
			retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
			resetAt: bucket.resetAt,
		}
	}

	prune(now) {
		for (const [key, bucket] of this.buckets) {
			if (bucket.resetAt <= now) this.buckets.delete(key)
		}
	}

	reset() {
		this.buckets.clear()
	}
}

function createRateLimiter(options = {}) {
	const { skip = [], ...limiterOptions } = options
	const limiter = new RateLimiter(limiterOptions)
	const skipPaths = new Set(['/health', ...skip])

	const middleware = (req, res, next) => {
		if (skipPaths.has(req.path)) return next()

		const apiKey = limiter.selectApiKey(extractApiKeys(req))
		const key = apiKey ? `key:${apiKey}` : `ip:${req.ip}`
		const limit = apiKey ? limiter.authenticatedLimit : limiter.anonymousLimit
		const result = limiter.hit(key, limit)

		res.set('X-RateLimit-Limit', String(result.limit))
		res.set('X-RateLimit-Remaining', String(result.remaining))
		res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))

		if (!result.allowed) {
			res.set('Retry-After', String(result.retryAfterSeconds))
			return res.status(429).json({ error: 'rate_limited', retry_after_seconds: result.retryAfterSeconds })
		}
		next()
	}

	middleware.limiter = limiter
	return middleware
}

module.exports = { RateLimiter, createRateLimiter, extractApiKey, extractApiKeys }
