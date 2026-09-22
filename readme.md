# Recipe App

This is a small, purposefully-incomplete recipe app intended to be used in some Copilot workshops. 

- Built with Node.js, Express, Handlebars, and Sqlite.
- Scafholds a database with seed data on first launch.
- Handles the creation, listing, and editing of recipes.

Some ideas of what to add:

- A `/recipes/random` endpoint to select a random recipe.
- A way to delete recipes within the web application.
- A way to search recipes.
- Support for multiple units of measurement on recipes. 

## Requirements

**Right click the following Codespaces button to open your Codespace in a new tab:**

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1026168589)

You can also run locally with the help of Dev Containers. If you want to run outside of a container, the setup should be the following commands in your terminal:

```bash
npm install
npm start
```
Visit `http://localhost:3000` to start managing your recipes.

## Configuration

All configuration is done through environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the HTTP server listens on. |
| `RATE_LIMIT_ANON_PER_MINUTE` | `60` | Maximum requests per minute for unauthenticated clients, counted per client IP. |
| `RATE_LIMIT_AUTH_PER_MINUTE` | `600` | Maximum requests per minute for authenticated clients, counted per API key (`X-API-Key` header or `Authorization: Bearer <key>`). |

Rate limits apply to every route except `GET /health`. When a limit is exceeded the server responds with
HTTP `429`, a `Retry-After` header (seconds) and the body `{"error": "rate_limited", "retry_after_seconds": N}`.
Every limited response also carries `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers.

## License

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](https://github.com/github-samples/node-recipe-app/blob/main/LICENSE) for the full terms.

## Support & Contributions

There is no support for this repository. It will periodically be updated as the needs for workshops where it is used evolves. We do not currently accept contributions. 
