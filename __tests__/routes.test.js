const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const path = require('path');
const exphbs = require('express-handlebars');
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

  describe('GET /recipes search', () => {
    beforeEach(async () => {
      await db.run(
        `INSERT INTO recipes (title, ingredients, method) VALUES
          ('Fluffy Pancakes', 'flour, milk, eggs', 'Whisk and fry'),
          ('Pan-Seared Salmon', 'salmon, oil', 'Sear in a hot pan'),
          ('Caesar Salad', 'romaine, parmesan', 'Toss everything in a pan')`
      );
    });

    const titles = (response) => response.body.locals.recipes.map((r) => r.title).sort();

    test('AC2: lists only recipes whose title contains the term', async () => {
      const response = await request(app).get('/recipes?q=pan');
      expect(response.status).toBe(200);
      expect(response.body.view).toBe('recipes');
      expect(titles(response)).toEqual(['Fluffy Pancakes', 'Pan-Seared Salmon']);
    });

    test('AC2: match is case-insensitive', async () => {
      const lower = await request(app).get('/recipes?q=pan');
      const upper = await request(app).get('/recipes?q=PAN');
      expect(titles(upper)).toEqual(titles(lower));
    });

    test('AC3: only the title is matched, not ingredients or method', async () => {
      const byMethod = await request(app).get('/recipes?q=pan');
      expect(titles(byMethod)).not.toContain('Caesar Salad');
      const byIngredient = await request(app).get('/recipes?q=parmesan');
      expect(titles(byIngredient)).toEqual([]);
    });

    test('AC4: submitted term is passed back to the view', async () => {
      const response = await request(app).get('/recipes?q=%20Salmon%20');
      expect(response.body.locals.search).toBe('Salmon');
      expect(titles(response)).toEqual(['Pan-Seared Salmon']);
    });

    test.each([
      ['no q', '/recipes'],
      ['empty q', '/recipes?q='],
      ['whitespace-only q', '/recipes?q=%20%20%20'],
    ])('AC4: %s lists all recipes', async (_label, url) => {
      const response = await request(app).get(url);
      expect(response.status).toBe(200);
      expect(response.body.locals.search).toBe('');
      expect(response.body.locals.recipes).toHaveLength(3);
    });

    test('AC5: no matching title returns an empty list with the term', async () => {
      const response = await request(app).get('/recipes?q=lasagna');
      expect(response.body.locals.recipes).toEqual([]);
      expect(response.body.locals.search).toBe('lasagna');
    });

    test.each([["%' OR 1=1 --"], ['<script>']])(
      'AC6: term %s is bound as a parameter and returns no rows',
      async (term) => {
        const response = await request(app).get('/recipes').query({ q: term });
        expect(response.status).toBe(200);
        expect(response.body.locals.recipes).toEqual([]);
      }
    );
  });

  describe('recipes view search UI', () => {
    const hbs = exphbs.create({ extname: '.hbs', helpers: { truncate: (s) => s } });
    const render = (locals) =>
      hbs.render(path.join(__dirname, '..', 'views', 'recipes.hbs'), locals);

    test('AC1: shows a labelled search input and Search button in a GET form to /recipes', async () => {
      const html = await render({ recipes: [], search: '' });
      expect(html).toMatch(/<form class="recipe-search" action="\/recipes" method="GET"/);
      expect(html).toContain('<label for="recipe-search-q">');
      expect(html).toMatch(/<input type="search" id="recipe-search-q" name="q"/);
      expect(html).toMatch(/<button type="submit"[^>]*>Search<\/button>/);
      expect(html).not.toContain('>Clear<');
    });

    test('AC4: keeps the submitted term and shows a Clear link', async () => {
      const html = await render({ recipes: [{ id: 1, title: 'Pan-Seared Salmon' }], search: 'salmon' });
      expect(html).toContain('value="salmon"');
      expect(html).toMatch(/<a href="\/recipes" class="btn btn-secondary">Clear<\/a>/);
    });

    test('AC5: no matches shows the no-match message, not the empty state', async () => {
      const html = await render({ recipes: [], search: 'lasagna' });
      expect(html).toContain('No recipes match "lasagna"');
      expect(html).not.toContain('Add your first recipe');
    });

    test('AC6: search term is HTML-escaped when rendered', async () => {
      const html = await render({ recipes: [], search: '<script>' });
      expect(html).not.toContain('<script>alert');
      expect(html).not.toMatch(/value="<script>"/);
      expect(html).toContain('value="&lt;script&gt;"');
      expect(html).toContain('No recipes match "&lt;script&gt;"');
    });
  });
});
