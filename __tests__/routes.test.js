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

  test('POST /recipes should persist a valid description', async () => {
    const newRecipe = {
      title: 'Described Recipe',
      description: 'A tasty description',
      ingredients: 'Ingredients',
      method: 'Method'
    };

    const response = await request(app)
      .post('/recipes')
      .send(newRecipe);

    expect(response.status).toBe(302);

    const recipe = await db.get('SELECT * FROM recipes WHERE title = ?', [newRecipe.title]);
    expect(recipe.description).toBe(newRecipe.description);
  });

  test('POST /recipes should reject a description longer than 300 characters', async () => {
    const newRecipe = {
      title: 'Too Long Description',
      description: 'a'.repeat(301),
      ingredients: 'Ingredients',
      method: 'Method'
    };

    const response = await request(app)
      .post('/recipes')
      .send(newRecipe);

    expect(response.status).toBe(400);

    const recipe = await db.get('SELECT * FROM recipes WHERE title = ?', [newRecipe.title]);
    expect(recipe).toBeUndefined();
  });

  test('POST /recipes/:id/edit should update the description', async () => {
    const { lastID } = await db.run(
      'INSERT INTO recipes (title, description, ingredients, method) VALUES (?, ?, ?, ?)',
      ['Editable Recipe', 'Original description', 'Ingredients', 'Method']
    );

    const response = await request(app)
      .post(`/recipes/${lastID}/edit`)
      .send({
        title: 'Editable Recipe',
        description: 'Updated description',
        ingredients: 'Ingredients',
        method: 'Method'
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`/recipes/${lastID}`);

    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [lastID]);
    expect(recipe.description).toBe('Updated description');
  });

  test('POST /recipes/:id/edit should reject a description longer than 300 characters', async () => {
    const { lastID } = await db.run(
      'INSERT INTO recipes (title, description, ingredients, method) VALUES (?, ?, ?, ?)',
      ['Editable Recipe', 'Original description', 'Ingredients', 'Method']
    );

    const response = await request(app)
      .post(`/recipes/${lastID}/edit`)
      .send({
        title: 'Editable Recipe',
        description: 'a'.repeat(301),
        ingredients: 'Ingredients',
        method: 'Method'
      });

    expect(response.status).toBe(400);

    const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [lastID]);
    expect(recipe.description).toBe('Original description');
  });
});