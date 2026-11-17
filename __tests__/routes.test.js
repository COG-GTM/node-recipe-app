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

  describe('random', () => {
    test('GET /recipes/random redirects to an existing recipe', async () => {
      const ids = [];
      for (const title of ['One', 'Two', 'Three']) {
        const { lastID } = await db.run(
          'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
          [title, 'x', 'y']
        );
        ids.push(lastID);
      }

      const response = await request(app).get('/recipes/random');

      expect(response.status).toBe(302);
      const match = response.headers.location.match(/^\/recipes\/(\d+)$/);
      expect(match).not.toBeNull();
      expect(ids).toContain(Number(match[1]));
    });

    test('GET /recipes/random is not treated as a recipe id', async () => {
      await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', ['Only', 'x', 'y']);
      const response = await request(app).get('/recipes/random');
      expect(response.status).toBe(302);
      expect(response.body.view).toBeUndefined();
    });

    test('GET /recipes/random redirects to the list when there are no recipes', async () => {
      const response = await request(app).get('/recipes/random');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/recipes');
    });
  });

  describe('GET /recipes/:id', () => {
    test('returns 200 with the recipe for a known id', async () => {
      const { lastID } = await db.run(
        'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
        ['Known', 'x', 'y']
      );
      const response = await request(app).get(`/recipes/${lastID}`);
      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipe');
      expect(response.body.locals.recipe.title).toBe('Known');
    });

    test('returns 404 with the not-found view for an unknown id', async () => {
      const response = await request(app).get('/recipes/9999');
      expect(response.status).toBe(404);
      expect(response.body.view).toBe('recipe');
      expect(response.body.locals.recipe).toBeUndefined();
    });

    test('returns 404 for a non-numeric id', async () => {
      const response = await request(app).get('/recipes/not-a-recipe');
      expect(response.status).toBe(404);
    });
  });
});
