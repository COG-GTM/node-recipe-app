const { RateLimiter, extractApiKey } = require('../src/rateLimit');
const { loadConfig, DEFAULTS } = require('../src/config');

function fakeClock(start = 0) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

describe('RateLimiter', () => {
  test('allows requests up to the limit and then rejects', () => {
    const limiter = new RateLimiter({ anonLimit: 3, authLimit: 10, now: fakeClock() });
    expect(limiter.consume('ip:1', 3).allowed).toBe(true);
    expect(limiter.consume('ip:1', 3).allowed).toBe(true);
    const third = limiter.consume('ip:1', 3);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    const fourth = limiter.consume('ip:1', 3);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBe(60);
  });

  test('keeps separate counters per bucket key', () => {
    const limiter = new RateLimiter({ anonLimit: 1, authLimit: 1, now: fakeClock() });
    expect(limiter.consume('ip:a', 1).allowed).toBe(true);
    expect(limiter.consume('ip:b', 1).allowed).toBe(true);
    expect(limiter.consume('key:k', 1).allowed).toBe(true);
    expect(limiter.consume('ip:a', 1).allowed).toBe(false);
  });

  test('retry_after decreases as the window elapses and resets afterwards', () => {
    const now = fakeClock();
    const limiter = new RateLimiter({ anonLimit: 1, authLimit: 1, now });
    limiter.consume('ip:a', 1);
    now.advance(45_500);
    expect(limiter.consume('ip:a', 1)).toMatchObject({ allowed: false, retryAfterSeconds: 15 });
    now.advance(15_000);
    expect(limiter.consume('ip:a', 1).allowed).toBe(true);
  });

  test('sweep removes expired buckets only', () => {
    const now = fakeClock();
    const limiter = new RateLimiter({ anonLimit: 1, authLimit: 1, now });
    limiter.consume('ip:old', 1);
    now.advance(60_000);
    limiter.consume('ip:new', 1);
    limiter.sweep();
    expect(limiter.buckets.has('ip:old')).toBe(false);
    expect(limiter.buckets.has('ip:new')).toBe(true);
  });
});

describe('extractApiKey', () => {
  const reqWith = (headers) => ({ get: (name) => headers[name.toLowerCase()] });

  test('reads X-API-Key', () => {
    expect(extractApiKey(reqWith({ 'x-api-key': ' abc ' }))).toBe('abc');
  });

  test('reads Authorization: Bearer', () => {
    expect(extractApiKey(reqWith({ authorization: 'Bearer xyz' }))).toBe('xyz');
  });

  test('returns null when absent or not bearer', () => {
    expect(extractApiKey(reqWith({}))).toBeNull();
    expect(extractApiKey(reqWith({ authorization: 'Basic dXNlcjpwdw==' }))).toBeNull();
  });
});

describe('loadConfig rate limit settings', () => {
  test('uses defaults when env vars are unset', () => {
    const config = loadConfig({});
    expect(config.rateLimitAnonPerMinute).toBe(DEFAULTS.rateLimitAnonPerMinute);
    expect(config.rateLimitAuthPerMinute).toBe(DEFAULTS.rateLimitAuthPerMinute);
    expect(DEFAULTS).toEqual({ rateLimitAnonPerMinute: 60, rateLimitAuthPerMinute: 600 });
  });

  test('reads overrides from env vars', () => {
    const config = loadConfig({ RATE_LIMIT_ANON_PER_MINUTE: '5', RATE_LIMIT_AUTH_PER_MINUTE: '50' });
    expect(config.rateLimitAnonPerMinute).toBe(5);
    expect(config.rateLimitAuthPerMinute).toBe(50);
  });

  test('rejects non-positive or non-numeric values', () => {
    expect(() => loadConfig({ RATE_LIMIT_ANON_PER_MINUTE: '0' })).toThrow();
    expect(() => loadConfig({ RATE_LIMIT_AUTH_PER_MINUTE: 'lots' })).toThrow();
  });
});
