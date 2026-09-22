const request = require('supertest');
const express = require('express');
const { createRateLimiter } = require('../src/rateLimit');

function createTestApp({ anonLimit = 2, authLimit = 3 } = {}) {
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(createRateLimiter({ anonLimit, authLimit, sweepIntervalMs: 0 }));
  app.get('/', (req, res) => res.json({ ok: true }));
  app.post('/recipes', (req, res) => res.status(201).json({ ok: true }));
  return app;
}

describe('rate limiting middleware (integration)', () => {
  test('unauthenticated client gets 429 with Retry-After after exceeding the IP limit', async () => {
    const app = createTestApp({ anonLimit: 2 });

    const first = await request(app).get('/');
    expect(first.status).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBe('1');

    const second = await request(app).post('/recipes');
    expect(second.status).toBe(201);

    const third = await request(app).get('/');
    expect(third.status).toBe(429);
    expect(third.headers['content-type']).toMatch(/application\/json/);
    expect(third.body.error).toBe('rate_limited');
    expect(Number.isInteger(third.body.retry_after_seconds)).toBe(true);
    expect(third.body.retry_after_seconds).toBeGreaterThan(0);
    expect(third.body.retry_after_seconds).toBeLessThanOrEqual(60);
    expect(third.headers['retry-after']).toBe(String(third.body.retry_after_seconds));
  });

  test('authenticated requests use the per-API-key limit', async () => {
    const app = createTestApp({ anonLimit: 1, authLimit: 3 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/').set('X-API-Key', 'key-1');
      expect(res.status).toBe(200);
      expect(res.headers['x-ratelimit-limit']).toBe('3');
    }
    const limited = await request(app).get('/').set('X-API-Key', 'key-1');
    expect(limited.status).toBe(429);

    const otherKey = await request(app).get('/').set('Authorization', 'Bearer key-2');
    expect(otherKey.status).toBe(200);

    const anon = await request(app).get('/');
    expect(anon.status).toBe(200);
  });

  test('health check endpoint is never rate limited', async () => {
    const app = createTestApp({ anonLimit: 1 });
    await request(app).get('/');
    expect((await request(app).get('/')).status).toBe(429);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
  });
});
