# Vercel deployment

The initial local Node server opened SQLite in the application directory at import time. That architecture does not work on Vercel's ephemeral filesystem and can cause FUNCTION_INVOCATION_FAILED. Moving SQLite to /tmp would lose data and is not the solution.

`vercel.json` explicitly serves the public assets statically and routes API calls to `api/workspace.mjs`. This function does not import the local SQLite server or start a listening socket. Node 24 is required by package.json. Keep the Vercel project root at the repository root and remove any project-level build/output overrides that conflict with the committed configuration.

## Preview without credentials

The page and sample data work immediately without a database. The preview is read-only and displays a banner. Writes return 503 with “Nothing was saved.” There is no ephemeral database fallback.

## Enable hosted persistence

Create an Upstash Redis database using your own account, then add these server-side environment variables in Vercel for the desired environments:

- `UPSTASH_REDIS_REST_URL` — HTTPS REST endpoint.
- `UPSTASH_REDIS_REST_TOKEN` — standard token (never put it in frontend code).
- `WORKSPACE_PASSWORD` — a strong random workspace password, required whenever storage is connected.

Redeploy after changing variables. Sign in with the workspace password. State, brand revisions and audit entries persist remotely. Writes use an atomic Redis Lua compare-and-set so competing updates return 409 instead of silently overwriting each other. Sessions use signed, expiring Secure/HttpOnly/SameSite cookies and survive cold starts. Authenticated API responses are never cached. Rotate the password to invalidate existing sessions.

This single-founder store uses one versioned Redis document; normalize records and implement retention and size limits before substantial use. OIDC, brute-force protection, permissions, production monitoring, provider adapters and backup policy are still pending. Do not treat this deployment fix as completion of the full production brief.

## Verification

Confirm `/` and `/app.js` respond successfully. `/api/state` should return a read-only sample with no credentials, 401 when password-protected, or authenticated hosted state after setup. An unconfigured `/api/action` must reject writes. Run `node --test` for local and hosted-handler checks; hosted-store tests use a fake REST transport, not a real paid database.

Official references: [Vercel SQLite limitations](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
