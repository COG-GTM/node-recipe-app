const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const { initializeTestDb } = require('./test-database');

// Mock the database module to use test database
jest.mock('../src/database', () => ({
  getDbConnection: () => require('./test-database').getTestDbConnection()
}));

// Simple app setup for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Simple mock for res.render
  app.use((req, res, next) => {
    res.render = (view, locals) => res.json({ view, locals });
    next();
  });
  
  app.use('/', routes);
  return app;
}

describe('Routes', () => {
  let app;
  let db;

  beforeEach(async () => {
    app = createTestApp();
    db = await initializeTestDb();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.view).toBe('home');
  });

  test('POST /recipes should create a new recipe', async () => {
    const newRecipe = {
      title: 'New Test Recipe',
      ingredients: 'New test ingredients',
      method: 'New test method'
    };

    const response = await request(app)
      .post('/recipes')
      .send(newRecipe);

    expect(response.status).toBe(302); // Redirect status
    expect(response.headers.location).toBe('/recipes');

    // Verify recipe was created
    const recipe = await db.get('SELECT * FROM recipes WHERE title = ?', [newRecipe.title]);
    expect(recipe).toBeDefined();
    expect(recipe.title).toBe(newRecipe.title);
  });

  describe('search and random', () => {
    async function seed() {
      const rows = [
        ['Spaghetti Carbonara', '1 lb spaghetti\n3 eggs', 'cook'],
        ['Caesar Salad', 'romaine lettuce\nparmesan', 'toss'],
        ['100% Juice', 'oranges', 'squeeze'],
      ];
      for (const row of rows) {
        await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', row);
      }
    }

    test('GET /recipes?q= matches title case-insensitively', async () => {
      await seed();
      const response = await request(app).get('/recipes').query({ q: 'caesar' });
      expect(response.status).toBe(200);
      expect(response.body.locals.query).toBe('caesar');
      expect(response.body.locals.recipes.map(r => r.title)).toEqual(['Caesar Salad']);
    });

    test('GET /recipes?q= matches ingredients', async () => {
      await seed();
      const response = await request(app).get('/recipes').query({ q: 'eggs' });
      expect(response.body.locals.recipes.map(r => r.title)).toEqual(['Spaghetti Carbonara']);
    });

    test('GET /recipes?q= treats % as a literal character', async () => {
      await seed();
      const response = await request(app).get('/recipes').query({ q: '%' });
      expect(response.body.locals.recipes.map(r => r.title)).toEqual(['100% Juice']);
    });

    test('GET /recipes?q= with no match returns an empty list', async () => {
      await seed();
      const response = await request(app).get('/recipes').query({ q: 'tofu' });
      expect(response.status).toBe(200);
      expect(response.body.locals.recipes).toEqual([]);
    });

    test('GET /recipes with a blank query returns all recipes', async () => {
      await seed();
      const response = await request(app).get('/recipes').query({ q: '   ' });
      expect(response.body.locals.recipes).toHaveLength(3);
      expect(response.body.locals.query).toBeUndefined();
    });

    test('GET /recipes/random redirects to an existing recipe', async () => {
      await seed();
      const ids = (await db.all('SELECT id FROM recipes')).map(r => `/recipes/${r.id}`);
      const response = await request(app).get('/recipes/random');
      expect(response.status).toBe(302);
      expect(ids).toContain(response.headers.location);
    });

    test('GET /recipes/random redirects to /recipes when there are no recipes', async () => {
      const response = await request(app).get('/recipes/random');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/recipes');
    });
  });
});
