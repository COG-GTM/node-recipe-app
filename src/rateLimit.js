const WINDOW_MS = 60 * 1000

function extractApiKey(req) {
	const header = req.get('x-api-key')
	if (header && header.trim()) return header.trim()
	const auth = req.get('authorization')
	if (auth) {
		const match = /^Bearer\s+(.+)$/i.exec(auth.trim())
		if (match) return match[1].trim()
	}
	return null
}

class RateLimiter {
	constructor({ anonLimit, authLimit, windowMs = WINDOW_MS, now = Date.now }) {
		this.anonLimit = anonLimit
		this.authLimit = authLimit
		this.windowMs = windowMs
		this.now = now
		this.buckets = new Map()
	}

	// Returns { allowed, limit, remaining, retryAfterSeconds }
	consume(bucketKey, limit) {
		const now = this.now()
		let bucket = this.buckets.get(bucketKey)
		if (!bucket || now >= bucket.resetAt) {
			bucket = { count: 0, resetAt: now + this.windowMs }
			this.buckets.set(bucketKey, bucket)
		}
		if (bucket.count >= limit) {
			return {
				allowed: false,
				limit,
				remaining: 0,
				retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
			}
		}
		bucket.count += 1
		return { allowed: true, limit, remaining: limit - bucket.count, retryAfterSeconds: 0 }
	}

	sweep() {
		const now = this.now()
		for (const [key, bucket] of this.buckets) {
			if (now >= bucket.resetAt) this.buckets.delete(key)
		}
	}

	middleware() {
		return (req, res, next) => {
			const apiKey = extractApiKey(req)
			const result = apiKey
				? this.consume(`key:${apiKey}`, this.authLimit)
				: this.consume(`ip:${req.ip}`, this.anonLimit)

			res.set('X-RateLimit-Limit', String(result.limit))
			res.set('X-RateLimit-Remaining', String(result.remaining))

			if (!result.allowed) {
				res.set('Retry-After', String(result.retryAfterSeconds))
				return res.status(429).json({
					error: 'rate_limited',
					retry_after_seconds: result.retryAfterSeconds,
				})
			}
			next()
		}
	}
}

function createRateLimiter(options) {
	const limiter = new RateLimiter(options)
	const handler = limiter.middleware()
	handler.limiter = limiter
	if (options.sweepIntervalMs !== 0) {
		const timer = setInterval(() => limiter.sweep(), options.sweepIntervalMs || WINDOW_MS)
		timer.unref()
	}
	return handler
}

module.exports = { createRateLimiter, RateLimiter, extractApiKey, WINDOW_MS }
