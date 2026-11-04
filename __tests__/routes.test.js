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

  test('GET /recipes/:id should return 404 for a missing recipe', async () => {
    const response = await request(app).get('/recipes/999');
    expect(response.status).toBe(404);
    expect(response.body.view).toBe('recipe');
    expect(response.body.locals.recipe).toBeNull();
  });

  test('GET /recipes/:id should return 200 for an existing recipe', async () => {
    const { lastID } = await db.run(
      'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
      ['Existing Recipe', 'eggs', 'cook']
    );
    const response = await request(app).get(`/recipes/${lastID}`);
    expect(response.status).toBe(200);
    expect(response.body.locals.recipe.title).toBe('Existing Recipe');
  });

  test.each(['', '   '])('POST /recipes should reject title %p with 400', async (title) => {
    const response = await request(app)
      .post('/recipes')
      .send({ title, ingredients: 'x', method: 'y' });

    expect(response.status).toBe(400);
    expect(response.body.view).toBe('recipes');
    expect(response.body.locals.error).toBe('Recipe title is required.');
    const { count } = await db.get('SELECT COUNT(*) AS count FROM recipes');
    expect(count).toBe(0);
  });

  test('POST /recipes/:id/edit should reject an empty title with 400', async () => {
    const { lastID } = await db.run(
      'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
      ['Original', 'eggs', 'cook']
    );
    const response = await request(app)
      .post(`/recipes/${lastID}/edit`)
      .send({ title: '', ingredients: 'eggs', method: 'cook' });

    expect(response.status).toBe(400);
    expect(response.body.locals.error).toBe('Recipe title is required.');
    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [lastID]);
    expect(recipe.title).toBe('Original');
  });

  test('POST /recipes/:id/edit should return 404 for a missing recipe', async () => {
    const response = await request(app)
      .post('/recipes/999/edit')
      .send({ title: 'New', ingredients: 'x', method: 'y' });
    expect(response.status).toBe(404);
  });
});
