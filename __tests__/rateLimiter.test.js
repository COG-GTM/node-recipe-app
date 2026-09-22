const { RateLimiter, extractApiKey } = require('../src/rateLimiter');
const { getRateLimitConfig, DEFAULTS } = require('../src/config');

function fakeClock(start = 0) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

describe('RateLimiter', () => {
  test('allows requests up to the limit and rejects the next one', () => {
    const limiter = new RateLimiter({ windowMs: 60000, now: fakeClock() });
    for (let i = 0; i < 3; i++) {
      const r = limiter.hit('ip:1.1.1.1', 3);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(2 - i);
    }
    const rejected = limiter.hit('ip:1.1.1.1', 3);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
    expect(rejected.retryAfterSeconds).toBe(60);
  });

  test('retryAfterSeconds shrinks as the window progresses and is at least 1', () => {
    const now = fakeClock();
    const limiter = new RateLimiter({ windowMs: 60000, now });
    limiter.hit('k', 1);
    now.advance(45500);
    expect(limiter.hit('k', 1).retryAfterSeconds).toBe(15);
    now.advance(14400);
    expect(limiter.hit('k', 1).retryAfterSeconds).toBe(1);
  });

  test('resets the counter once the window elapses', () => {
    const now = fakeClock();
    const limiter = new RateLimiter({ windowMs: 60000, now });
    limiter.hit('k', 1);
    expect(limiter.hit('k', 1).allowed).toBe(false);
    now.advance(60000);
    expect(limiter.hit('k', 1).allowed).toBe(true);
  });

  test('tracks keys independently', () => {
    const limiter = new RateLimiter({ windowMs: 60000, now: fakeClock() });
    limiter.hit('ip:a', 1);
    expect(limiter.hit('ip:a', 1).allowed).toBe(false);
    expect(limiter.hit('ip:b', 1).allowed).toBe(true);
    expect(limiter.hit('key:abc', 1).allowed).toBe(true);
  });

  test('prunes expired buckets', () => {
    const now = fakeClock();
    const limiter = new RateLimiter({ windowMs: 1000, now });
    limiter.hit('a', 5);
    limiter.hit('b', 5);
    expect(limiter.buckets.size).toBe(2);
    now.advance(1000);
    limiter.hit('c', 5);
    expect(limiter.buckets.size).toBe(1);
  });

  test('uses configured defaults when no options are given', () => {
    const limiter = new RateLimiter();
    expect(limiter.anonymousLimit).toBe(DEFAULTS.anonymousLimit);
    expect(limiter.authenticatedLimit).toBe(DEFAULTS.authenticatedLimit);
    expect(limiter.windowMs).toBe(DEFAULTS.windowMs);
  });
});

describe('extractApiKey', () => {
  const req = (headers) => ({ get: (name) => headers[name.toLowerCase()] });

  test('reads X-API-Key', () => {
    expect(extractApiKey(req({ 'x-api-key': ' abc ' }))).toBe('abc');
  });

  test('reads Authorization: Bearer', () => {
    expect(extractApiKey(req({ authorization: 'Bearer xyz' }))).toBe('xyz');
  });

  test('ignores non-bearer Authorization and missing headers', () => {
    expect(extractApiKey(req({ authorization: 'Basic xyz' }))).toBeNull();
    expect(extractApiKey(req({}))).toBeNull();
  });
});

describe('getRateLimitConfig', () => {
  test('returns defaults when env vars are unset', () => {
    expect(getRateLimitConfig({})).toEqual({ anonymousLimit: 60, authenticatedLimit: 600, windowMs: 60000 });
  });

  test('reads overrides from env vars', () => {
    const cfg = getRateLimitConfig({ RATE_LIMIT_ANON_PER_MINUTE: '5', RATE_LIMIT_AUTH_PER_MINUTE: '50' });
    expect(cfg.anonymousLimit).toBe(5);
    expect(cfg.authenticatedLimit).toBe(50);
  });

  test('rejects invalid values', () => {
    expect(() => getRateLimitConfig({ RATE_LIMIT_ANON_PER_MINUTE: 'abc' })).toThrow();
    expect(() => getRateLimitConfig({ RATE_LIMIT_AUTH_PER_MINUTE: '0' })).toThrow();
    expect(() => getRateLimitConfig({ RATE_LIMIT_AUTH_PER_MINUTE: '-1' })).toThrow();
  });
});
