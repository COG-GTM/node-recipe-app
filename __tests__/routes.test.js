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

  describe('search', () => {
    beforeEach(async () => {
      await db.run(
        `INSERT INTO recipes (title, ingredients, method) VALUES
          ('Spaghetti Carbonara', '1 lb spaghetti\n3 eggs', 'Cook'),
          ('Chocolate Chip Cookies', '2 cups flour\n2 eggs', 'Bake'),
          ('Caesar Salad', 'romaine lettuce\nparmesan', 'Toss'),
          ('100% Rye Bread', 'rye flour', 'Bake')`
      );
    });

    test('GET /recipes without a query lists every recipe', async () => {
      const response = await request(app).get('/recipes');
      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipes');
      expect(response.body.locals.recipes).toHaveLength(4);
      expect(response.body.locals.query).toBeUndefined();
    });

    test('GET /recipes?q= matches titles case-insensitively', async () => {
      const response = await request(app).get('/recipes').query({ q: 'caesar' });
      expect(response.status).toBe(200);
      expect(response.body.locals.query).toBe('caesar');
      expect(response.body.locals.recipes.map(r => r.title)).toEqual(['Caesar Salad']);
    });

    test('GET /recipes?q= matches ingredients', async () => {
      const response = await request(app).get('/recipes').query({ q: 'eggs' });
      expect(response.body.locals.recipes.map(r => r.title).sort()).toEqual([
        'Chocolate Chip Cookies',
        'Spaghetti Carbonara',
      ]);
    });

    test('GET /recipes?q= returns an empty list when nothing matches', async () => {
      const response = await request(app).get('/recipes').query({ q: 'tofu' });
      expect(response.status).toBe(200);
      expect(response.body.locals.recipes).toEqual([]);
      expect(response.body.locals.query).toBe('tofu');
    });

    test('GET /recipes?q= treats LIKE wildcards literally', async () => {
      const response = await request(app).get('/recipes').query({ q: '%' });
      expect(response.body.locals.recipes.map(r => r.title)).toEqual(['100% Rye Bread']);
    });

    test('GET /recipes?q= with only whitespace lists every recipe', async () => {
      const response = await request(app).get('/recipes').query({ q: '   ' });
      expect(response.body.locals.recipes).toHaveLength(4);
      expect(response.body.locals.query).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('POST /recipes/:id/delete removes the recipe and redirects to the list', async () => {
      const { lastID } = await db.run(
        'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
        ['Doomed Recipe', 'x', 'y']
      );
      const { lastID: keptId } = await db.run(
        'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
        ['Kept Recipe', 'x', 'y']
      );

      const response = await request(app).post(`/recipes/${lastID}/delete`);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/recipes');
      expect(await db.get('SELECT * FROM recipes WHERE id = ?', [lastID])).toBeUndefined();
      expect(await db.get('SELECT * FROM recipes WHERE id = ?', [keptId])).toBeDefined();
    });

    test('POST /recipes/:id/delete for a missing id still redirects', async () => {
      const response = await request(app).post('/recipes/9999/delete');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/recipes');
    });

    test('GET /recipes/:id/delete is not a delete route', async () => {
      const { lastID } = await db.run(
        'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
        ['Safe Recipe', 'x', 'y']
      );
      await request(app).get(`/recipes/${lastID}/delete`);
      expect(await db.get('SELECT * FROM recipes WHERE id = ?', [lastID])).toBeDefined();
    });
  });
});
