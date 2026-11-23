const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const path = require('path');
const { create } = require('express-handlebars');
const { initializeTestDb } = require('./test-database');
const { createInitialRecords } = require('../src/database/seedData');

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

  describe('GET /recipes ingredient count', () => {
    const recipeByTitle = (response, title) =>
      response.body.locals.recipes.find(recipe => recipe.title === title);

    test('AC1: every seeded recipe has an ingredient count label', async () => {
      await createInitialRecords(db);

      const response = await request(app).get('/recipes');

      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipes');
      const { recipes } = response.body.locals;
      expect(recipes).toHaveLength(3);
      expect(recipeByTitle(response, 'Chocolate Chip Cookies').ingredientCountLabel).toBe('6 ingredients');
      expect(recipeByTitle(response, 'Spaghetti Carbonara').ingredientCountLabel).toBe('4 ingredients');
      expect(recipeByTitle(response, 'Caesar Salad').ingredientCountLabel).toBe('5 ingredients');
    });

    test('AC1: the recipes view renders the count next to each title', async () => {
      await createInitialRecords(db);
      const response = await request(app).get('/recipes');

      const hbs = create({
        extname: '.hbs',
        helpers: { truncate: (str, len) => (str && str.length > len ? str.substring(0, len) + '...' : str) },
      });
      const html = await hbs.render(path.join(__dirname, '..', 'views', 'recipes.hbs'), response.body.locals);

      expect(html).toMatch(/Chocolate Chip Cookies<\/a>\s*<span class="ingredient-count">6 ingredients<\/span>/);
      expect(html).toMatch(/Spaghetti Carbonara<\/a>\s*<span class="ingredient-count">4 ingredients<\/span>/);
      expect(html).toMatch(/Caesar Salad<\/a>\s*<span class="ingredient-count">5 ingredients<\/span>/);
    });

    test('AC2: blank lines and \\r\\n line endings are handled', async () => {
      await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', [
        'Messy Recipe',
        'flour\r\n\r\n  \r\nsugar\n\neggs\n',
        'Mix',
      ]);

      const response = await request(app).get('/recipes');

      const recipe = recipeByTitle(response, 'Messy Recipe');
      expect(recipe.ingredientCount).toBe(3);
      expect(recipe.ingredientCountLabel).toBe('3 ingredients');
    });

    test('AC3: a single ingredient uses the singular label', async () => {
      await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', ['Toast', 'bread', 'Toast it']);

      const response = await request(app).get('/recipes');

      expect(recipeByTitle(response, 'Toast').ingredientCountLabel).toBe('1 ingredient');
    });

    test('AC4: empty or null ingredients show 0 ingredients without error', async () => {
      await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', ['Empty', '', 'Nothing']);
      await db.run('INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)', ['Null', null, 'Nothing']);

      const response = await request(app).get('/recipes');

      expect(response.status).toBe(200);
      expect(recipeByTitle(response, 'Empty').ingredientCountLabel).toBe('0 ingredients');
      expect(recipeByTitle(response, 'Null').ingredientCountLabel).toBe('0 ingredients');
    });

    test('AC5: recipes added or edited via POST show the new count', async () => {
      await request(app)
        .post('/recipes')
        .send({ title: 'Pancakes', ingredients: 'flour\nmilk\neggs', method: 'Whisk and fry' });

      let response = await request(app).get('/recipes');
      const pancakes = recipeByTitle(response, 'Pancakes');
      expect(pancakes.ingredientCountLabel).toBe('3 ingredients');

      await request(app)
        .post(`/recipes/${pancakes.id}/edit`)
        .send({ title: 'Pancakes', ingredients: 'flour\nmilk\neggs\nbutter\nsalt', method: 'Whisk and fry' });

      response = await request(app).get('/recipes');
      expect(recipeByTitle(response, 'Pancakes').ingredientCountLabel).toBe('5 ingredients');
    });
  });
});
