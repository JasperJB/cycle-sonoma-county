# Decisions

## 1. Embedded Postgres for local development

Decision:
Use `embedded-postgres` instead of requiring Docker or a manually installed local PostgreSQL server.

Reason:
The environment did not include Docker or `psql`, but the stack requirement still called for PostgreSQL + Prisma. Embedded Postgres kept the stack honest without introducing a second dev setup track.

Tradeoff:
Shutdown logs can be noisier than a long-running system Postgres install, but the local bootstrap is dramatically simpler.

## 2. Cognito OIDC with development auth fallback

Decision:
Implement Cognito OIDC for production and a seeded local dev-login flow when Cognito is not configured.

Reason:
Self-service signup and login still route through Cognito in real deployments, while local development remains usable without AWS credentials.

Tradeoff:
There are two auth paths, but only one is intended for production.

## 3. DB-safe public build fallbacks

Decision:
Public read helpers catch DB connectivity failures and degrade to empty states during build.

Reason:
This keeps production builds resilient when the database is not available at build time, especially in local or partially configured environments.

Tradeoff:
An unavailable database during build will not hard-fail the build, so operators still need runtime checks and deployment discipline.

## 4. Server-first UI

Decision:
Keep most public pages and dashboards server-rendered; use client components only for forms, optimistic buttons, and mapping.

Reason:
The site is content-heavy, SEO-sensitive, and benefits from predictable server-side authorization.

Tradeoff:
Some interactive flows require explicit server-action boundaries and slightly more wiring.

## 5. Separate ride and event content models

Decision:
Model recurring rides and events separately rather than as a single event table with categories.

Reason:
The product requirement explicitly treats ride series and event calendars differently, and the UX needs different filtering, detail pages, and schedule semantics.

Tradeoff:
There is some duplication between the two recurrence-backed models, but the public UX stays clearer.

## 6. Manual sponsor system without billing

Decision:
Build sponsor placements, slots, and click/impression-ready schema without payments.

Reason:
The product needed future extensibility without adding payment complexity or ad-network clutter now.

Tradeoff:
Sponsor operations remain admin-managed until billing is added later.

## 7. Local upload fallback

Decision:
Use Vercel Blob when configured, otherwise write uploads into `public/uploads`.

Reason:
Media handling needed to function before deployment credentials were available.

Tradeoff:
The fallback is only appropriate for local or single-instance development.

## 8. Daily digest preview-first newsletter flow

Decision:
Support dry-run digest creation with optional real sending through Resend-compatible HTTP calls.

Reason:
The product needed a single site-wide newsletter that does not break when provider env vars are missing.

Tradeoff:
Preview mode is intentionally the default until operators configure sender credentials.
