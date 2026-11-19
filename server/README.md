# API server

Use Node 22.12 or later. Copy `.env.example` to `.env` to customize `PORT`,
`DB_PATH`, and `PUBLIC_URL`. `DB_PATH` is reserved for the database module in #39;
this skeleton does not create a database. Relative paths resolve from the repository root.

`npm run dev` starts the Express API on port 3001 and Vite on port 3000.
Vite proxies `/api` to the configured API port. `npm run build` typechecks
and builds both applications. `npm start` runs the compiled server in production,
serving the SPA and API from one port. Run commands from the repository root.

Express was chosen for its familiar middleware and static serving support.
`server/app.ts` exports the app factory so routes can be tested without starting
the production entry point. Shared response contracts live in `types/api.ts`.
API failures use `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
with an appropriate HTTP status. Internal error details are never returned.

Run `npm run test:server` for configuration, health, static routing, and error
checks. CI's `npm run build` also compiles the server after #21 is merged.
