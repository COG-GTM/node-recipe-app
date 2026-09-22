const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const { createRateLimiter } = require('../src/rateLimiter');
const { initializeTestDb } = require('./test-database');

jest.mock('../src/database', () => ({
  getDbConnection: () => require('./test-database').getTestDbConnection()
}));

function createTestApp(limiterOptions) {
  const app = express();
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(createRateLimiter(limiterOptions));
  app.use(express.json());
  app.use((req, res, next) => {
    res.render = (view, locals) => res.json({ view, locals });
    next();
  });
  app.use('/', routes);
  return app;
}

describe('Rate limiting integration', () => {
  let db;

  beforeEach(async () => {
    db = await initializeTestDb();
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  test('unauthenticated client gets 429 with Retry-After after exceeding the limit', async () => {
    const app = createTestApp({ anonymousLimit: 2, authenticatedLimit: 10 });

    const first = await request(app).get('/');
    expect(first.status).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBe('1');

    await request(app).get('/recipes').expect(200);

    const limited = await request(app).get('/recipes');
    expect(limited.status).toBe(429);
    expect(limited.headers['content-type']).toMatch(/application\/json/);
    expect(limited.headers['retry-after']).toMatch(/^\d+$/);
    const retryAfter = Number(limited.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(limited.body).toEqual({ error: 'rate_limited', retry_after_seconds: retryAfter });
  });

  test('authenticated clients are limited per API key with the higher limit', async () => {
    const app = createTestApp({ anonymousLimit: 1, authenticatedLimit: 3 });

    for (let i = 0; i < 3; i++) {
      await request(app).get('/').set('X-API-Key', 'key-one').expect(200);
    }
    await request(app).get('/').set('X-API-Key', 'key-one').expect(429);
    await request(app).get('/').set('Authorization', 'Bearer key-two').expect(200);
    await request(app).get('/').expect(200);
    await request(app).get('/').expect(429);
  });

  test('unknown keys fall back to the per-IP limit when an allowlist is configured', async () => {
    const app = createTestApp({ anonymousLimit: 1, authenticatedLimit: 5, apiKeys: new Set(['valid']) });
    await request(app).get('/').set('X-API-Key', 'rotating-1').expect(200);
    await request(app).get('/').set('X-API-Key', 'rotating-2').expect(429);
    await request(app).get('/').set('X-API-Key', 'valid').expect(200);
    await request(app).get('/').set('X-API-Key', 'stale').set('Authorization', 'Bearer valid').expect(200);
  });

  test('POST routes are covered too', async () => {
    const app = createTestApp({ anonymousLimit: 1 });
    await request(app).get('/').expect(200);
    const res = await request(app).post('/recipes').send({ title: 't', ingredients: 'i', method: 'm' });
    expect(res.status).toBe(429);
    expect(await db.get('SELECT COUNT(*) AS n FROM recipes')).toEqual({ n: 0 });
  });

  test('/health is never rate limited', async () => {
    const app = createTestApp({ anonymousLimit: 1 });
    await request(app).get('/').expect(200);
    await request(app).get('/').expect(429);
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
  });
});
