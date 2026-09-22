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

The app is configured through environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Port the HTTP server listens on. |
| `RATE_LIMIT_ANON_PER_MINUTE` | `60` | Requests per minute allowed for unauthenticated clients, tracked per client IP. |
| `RATE_LIMIT_AUTH_PER_MINUTE` | `600` | Requests per minute allowed for authenticated clients, tracked per API key. |
| `RATE_LIMIT_API_KEYS` | _(unset)_ | Comma-separated list of accepted API keys. When set, only these keys get the authenticated limit; unknown keys are treated as unauthenticated (an empty value accepts no keys). When unset, any presented key is accepted (development only). |
| `TRUST_PROXY` | _(unset)_ | Express `trust proxy` setting (e.g. `1`, `loopback`, `10.0.0.0/8`). Set this when running behind a reverse proxy so per-IP limits use the real client address. |

### Rate limiting

Every route except `GET /health` is rate limited. A request counts as authenticated when it carries an `X-API-Key: <key>` header or an `Authorization: Bearer <key>` header (and, if `RATE_LIMIT_API_KEYS` is set, the key is in that list); otherwise it is counted against the client IP (`req.ip`, see `TRUST_PROXY`). Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. When a limit is exceeded the server responds with `429 Too Many Requests`, a `Retry-After` header (seconds) and the body:

```json
{ "error": "rate_limited", "retry_after_seconds": 42 }
```

Counters are kept in memory per process and reset on restart.

## License

This project is licensed under the terms of the MIT open source license. Please refer to [MIT](https://github.com/github-samples/node-recipe-app/blob/main/LICENSE) for the full terms.

## Support & Contributions

There is no support for this repository. It will periodically be updated as the needs for workshops where it is used evolves. We do not currently accept contributions. 
