# Architecture

## Overview

Cycle Sonoma County is a Next.js App Router application with three major surfaces:

- public discovery pages for visitors and locals
- organizer tools for verified publishers
- an admin console for moderation, sponsor management, and newsletter operations

The app is intentionally server-heavy. Public pages fetch from Prisma in server components, while authenticated mutations use server actions. Client components are used where browser APIs or rich interaction are required: forms, the map, and optimistic favorite/follow buttons.

## Runtime layers

### UI

- `app/` contains routes for public pages, auth routes, admin, organizer, uploads, and cron.
- `components/` contains shared UI, cards, forms, explore-map interaction, and layout chrome.
- Tailwind variables in `app/globals.css` define the product theme.

### Data

- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)
- Generated client: `app/generated/prisma`
- Public read models: [lib/data/public.ts](lib/data/public.ts)
- Console read models: [lib/data/dashboard.ts](lib/data/dashboard.ts)

### Auth

- Session cookies: [lib/auth/session.ts](lib/auth/session.ts)
- Cognito OIDC flow: [lib/auth/cognito.ts](lib/auth/cognito.ts)
- User sync and role mapping: [lib/auth/user.ts](lib/auth/user.ts)

Production auth path:

1. Cognito managed login or signup
2. OIDC callback
3. Cognito claims mapped into the application user record
4. Signed session cookie issued by the app
5. Runtime permissions checked against DB state

Local fallback auth path:

1. Visit `/auth/dev-login`
2. Choose a seeded demo user
3. Signed session cookie issued directly

### Domain logic

- Recurrence engine: [lib/recurrence.ts](lib/recurrence.ts)
- Newsletter digest generation: [lib/newsletter.ts](lib/newsletter.ts)
- Upload handling: [lib/uploads.ts](lib/uploads.ts)
- Validation: [lib/validators.ts](lib/validators.ts)

## Database model

The schema centers on `Organization` as the parent entity and fans out into:

- `ShopProfile`
- `ClubProfile`
- `RideSeries` + `RideOccurrence` + `RideException`
- `EventSeries` + `EventOccurrence`
- `RouteGuide`

Operational entities:

- `User`
- `VerificationRequest`
- `OrganizationMembership`
- `Favorite`
- `Follow`
- `SponsorPlacement`
- `NewsletterSubscriber`
- `NewsletterDigest`
- `Report`
- `AuditLog`
- `SiteSetting`

## Recurrence

Recurring rides and recurring events store:

- recurrence rule string
- recurrence summary text
- timezone
- last confirmed timestamp
- materialized upcoming occurrences
- exceptions for cancellations and reschedules

The occurrence materializer:

1. builds an RRule from schedule inputs
2. materializes upcoming dates into a finite window
3. overlays exceptions
4. stores the resulting occurrence rows for fast queries

## Public caching

Public page query helpers use cache-friendly server reads and safe fallbacks:

- home, index, route, and list pages use server reads with `revalidate`
- build-time DB failures degrade to empty states rather than breaking production builds
- detail pages remain server-rendered

## Local infrastructure

Local PostgreSQL is embedded using `embedded-postgres`:

- [scripts/start-embedded-postgres.ts](scripts/start-embedded-postgres.ts)
- [scripts/db-prepare.ts](scripts/db-prepare.ts)
- [scripts/dev-local.ts](scripts/dev-local.ts)

This keeps the repository runnable without requiring Docker or a preinstalled Postgres server.

## External services

- Cognito for identity and coarse roles
- Vercel Blob for media storage with local fallback
- Resend-compatible HTTP API for newsletter sending
- Vercel cron for daily automation

## Security model

- public visitors browse without login
- all write actions validate on the server with Zod
- admin and organizer surfaces are server-protected
- DB membership and organizer approval state are the runtime source of truth
- uploads require authentication and validate MIME type + size
