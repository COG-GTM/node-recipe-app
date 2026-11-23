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

  describe('GET /recipes alphabetical sorting', () => {
    const insertRecipe = (title) =>
      db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', [title, 'ingredients', 'method']);
    const titlesFrom = (response) => response.body.locals.recipes.map((r) => r.title);

    test('AC1: sorts recipes A to Z by title, case-insensitive', async () => {
      await insertRecipe('Pancakes');
      await insertRecipe('apple pie');
      await insertRecipe('Banana Bread');

      const response = await request(app).get('/recipes');

      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipes');
      expect(titlesFrom(response)).toEqual(['apple pie', 'Banana Bread', 'Pancakes']);
    });

    test('AC2: a recipe added via POST /recipes appears in its alphabetical position', async () => {
      await insertRecipe('Apple Pie');
      await insertRecipe('Pancakes');

      const postResponse = await request(app)
        .post('/recipes')
        .send({ title: 'Banana Bread', ingredients: 'bananas', method: 'bake' });
      expect(postResponse.headers.location).toBe('/recipes');

      const response = await request(app).get('/recipes');
      expect(titlesFrom(response)).toEqual(['Apple Pie', 'Banana Bread', 'Pancakes']);
    });

    test('AC3: editing a title via POST /recipes/:id/edit moves it to its new alphabetical position', async () => {
      await insertRecipe('Apple Pie');
      const { lastID } = await insertRecipe('Banana Bread');
      await insertRecipe('Pancakes');

      await request(app)
        .post(`/recipes/${lastID}/edit`)
        .send({ title: 'Zucchini Loaf', ingredients: 'zucchini', method: 'bake' });

      const response = await request(app).get('/recipes');
      expect(titlesFrom(response)).toEqual(['Apple Pie', 'Pancakes', 'Zucchini Loaf']);
    });

    test('AC4: renders the recipes view with an empty list when there are no recipes', async () => {
      const response = await request(app).get('/recipes');

      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipes');
      expect(response.body.locals.recipes).toEqual([]);
    });
  });
});
