# Cobridey Assistant

A polished, palette-inspired founder workspace for Cobridey. **Foundation release — not a production-ready social automation system.** All conversations and initial content are labeled samples. No performance metrics, account connections, AI output, publishing receipts, or email sends are fabricated.

## Run

Requires Node.js 24+. No dependencies to install.

```sh
node --env-file-if-exists=.env server.mjs
```

Open http://127.0.0.1:3000. Copy `.env.example` to `.env` to set a workspace password. The server binds to loopback by default. For remote deployment use HTTPS behind a reverse proxy, set `HOST=0.0.0.0`, and supply a strong `WORKSPACE_PASSWORD`. Do not deploy this foundation to the public internet without the hardening listed below. `npm start` also works with environment variables supplied by your process manager.

## Working functionality

- Responsive overview and ten navigable workspace areas.
- Content creation, editing, approval, local scheduling, and JSON manual handoff export.
- SQLite persistence with atomic audit writes and brand revision history.
- Global pause and operating-mode preferences.
- Sample inbox resolution and honest unavailable analytics.
- Password gate when configured, expiring HttpOnly SameSite sessions, origin checks, bounded request bodies, parameterized SQL, escaped user text.
- Command routing to workspace tools. This is **not** a connected language model.

## Architecture and deployment

Dependency-free Node HTTP server + SQLite (WAL) + browser JavaScript. This keeps the initial solo-founder workspace easy to run and inspect. API mutations live in `server.mjs`; views in `public/app.js`; design tokens and responsive layouts in `public/style.css`. Database schema is applied idempotently at startup. State and audit records live in `data/workspace.sqlite`; never commit this directory.

Deploy on one persistent Node host with an attached persistent disk. Run one process until storage is normalized and concurrency is tested. Back up SQLite using the SQLite backup API or a consistent stopped-process copy, including a tested restore procedure. Do not deploy SQLite on ephemeral serverless storage. No background process sends content in this release.

## Delivery phases

1. **Delivered foundation:** design, brand facts/version history, strategy template, content drafts, approval, local calendar, pause, audit, manual exports.
2. **Next:** normalize schema and migrations; OIDC, RBAC, CSRF tokens, login throttling, session persistence, retention/deletion/export, backup automation, monitoring; object storage and signed asset uploads; provider-independent structured AI with budgets and factual grounding.
3. **One-channel vertical slice:** reviewed OAuth + encrypted refresh tokens; durable leased jobs, idempotency keys, retries with jitter, rate-limit handling, ambiguous-response reconciliation; confirmed platform receipts. Test this end-to-end before adding other channels.
4. **Community and email:** signed deduplicated webhooks, reviewable replies, consent ledger, suppression checks before every send, bounce/complaint processing, loop prevention and escalation.
5. **Analytics and autonomy:** attributed conversion events, freshness and metric definitions, evidence-based experiments; enforce approval rules, spend limits and pause at execution time.

## Current limits

No OAuth adapters, queue/worker, live AI, media uploads, channel publishing, replies, marketing sends, live metrics, drag/drop calendar, team roles, encrypted token storage, or automatic backups are implemented. Mode choices are stored preferences only. The calendar is the October 2026 month view. Editing a scheduled post does not send anything. Existing sample posts are supplied editorial examples, not testimonials or live campaigns.

The full brief cannot be accepted as production-complete until real accounts, providers, app reviews and failure scenarios are implemented and verified. Founder inputs needed for that phase: official website and approved product details; target market/timezone; account ownership; provider/AI budget; app registrations and approved permissions. Never send secrets in GitHub issues or frontend code.

## Validation

`node --test` runs isolated API integration checks against a temporary copy: persistence across restart, approve-before-schedule, validation, global pause, audit history, origin rejection, and password/session access. Browser QA may depend on local preview reachability.

See [integration research](docs/INTEGRATIONS.md) for constraints, sources, and budgeting assumptions.

## Vercel

Vercel deployments use the separate stateless API entry point and external Redis storage. Without credentials, the hosted page is a read-only sample. See [Vercel setup](docs/VERCEL.md). Local execution still uses SQLite.

