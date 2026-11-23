# Review Guidelines

## Critical Areas
- `src/database/`: every SQL statement must use `?` placeholders. Never build SQL with string interpolation or concatenation of request data.
- `src/routes.js`: any route that creates, changes or deletes data must use POST (or another non-GET method). GET routes must be read-only.
- Validate all user input on the server before it reaches the database (numbers in range, required fields present).

## Conventions
- Database access goes through `src/database/recipeRepository.js`; route handlers should not open their own connections.
- New routes need a test in `__tests__/routes.test.js`.

## Ignore
- `package-lock.json`
- `public/style.css` cosmetic-only changes
