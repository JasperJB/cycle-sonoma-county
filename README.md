# Cycle Sonoma County

Cycle Sonoma County is a production-oriented Next.js site for Sonoma County cycling discovery and organizer operations. It supports public browsing, recurring ride and event listings, organizer verification, admin moderation, sponsor placements, a single site-wide newsletter, and a map-driven explore experience.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui patterns
- PostgreSQL + Prisma
- Cognito OIDC or local development auth fallback
- Vercel Blob with local filesystem fallback for uploads
- React Hook Form + Zod
- React Leaflet + marker clustering
- `rrule` + `date-fns` / `date-fns-tz`
- Vitest + Playwright

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment defaults:

```bash
cp .env.example .env
```

3. Start the full local stack with embedded Postgres:

```bash
npm run dev:local
```

This command:

- boots an embedded PostgreSQL 18 instance into `.local/postgres`
- applies Prisma migrations
- seeds Sonoma-themed demo data
- starts Next.js on `http://localhost:3000`

If you want to prepare the database separately:

```bash
npm run db:prepare
npm run dev
```

## Demo auth

Without Cognito env vars, the app falls back to development auth at `/auth/dev-login`.

Seeded demo users:

- `member@cyclesonoma.demo`
- `organizer@cyclesonoma.demo`
- `admin@cyclesonoma.demo`

## Environment variables

See [.env.example](.env.example). Key values:

- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `DEV_AUTH_ENABLED`
- `COGNITO_ISSUER`
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET`
- `COGNITO_DOMAIN`
- `COGNITO_REDIRECT_URI`
- `COGNITO_LOGOUT_URI`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `BLOB_READ_WRITE_TOKEN`
- `GEOCODING_API_URL`
- `GEOCODING_API_KEY`
- `RESEND_API_KEY`
- `NEWSLETTER_FROM_EMAIL`
- `CRON_SECRET`

## Prisma and seed data

Generate the client:

```bash
npm run prisma:generate
```

Apply migrations and seed:

```bash
npm run db:prepare
```

The seed creates:

- 3 fictional bike shops
- 5 fictional clubs / teams / groups
- 6 ride series with weekly and monthly recurrence
- 6 events
- 5 route guides
- verification queue entries
- reports, sponsors, and newsletter subscribers

Import templates live in [data/import-templates](data/import-templates).

## Cognito bootstrap flow

The repo includes idempotent AWS CLI scripts for Cognito:

- [scripts/bootstrap-cognito.sh](scripts/bootstrap-cognito.sh)
- [scripts/update-cognito-callbacks.sh](scripts/update-cognito-callbacks.sh)
- [scripts/create-admin-user.sh](scripts/create-admin-user.sh)
- [scripts/promote-organizer.sh](scripts/promote-organizer.sh)
- [scripts/demote-organizer.sh](scripts/demote-organizer.sh)
- [scripts/diagnose-cognito.sh](scripts/diagnose-cognito.sh)

On Windows, run these scripts through Git Bash, for example:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -lc "cd '/c/Users/your-user/path/to/cycle-sonoma-county' && ./scripts/diagnose-cognito.sh"
```

Example bootstrap:

```bash
AWS_REGION=us-west-2 \
LOCAL_URL=http://localhost:3000 \
PRODUCTION_URL=https://your-production-domain.vercel.app \
./scripts/bootstrap-cognito.sh
```

Create the first admin:

```bash
AWS_REGION=us-west-2 ./scripts/create-admin-user.sh admin@example.com
```

Promote an organizer by email:

```bash
AWS_REGION=us-west-2 ./scripts/promote-organizer.sh organizer@example.com
```

Diagnose current Cognito config:

```bash
AWS_REGION=us-west-2 ./scripts/diagnose-cognito.sh
```

## Organizer approval flow

1. Sign in as a member.
2. Open `/become-organizer`.
3. Submit the verification form.
4. Sign in as `admin@cyclesonoma.demo` or a Cognito admin user.
5. Open `/admin`.
6. Approve or reject the request from the verification queue.
7. On approval, the organizer sees the onboarding wizard in `/organizer`.

## Newsletter

Preview or run the site-wide digest from `/admin/newsletter`.

- With no email provider configured, the digest is stored as a dry-run preview in the database.
- With `RESEND_API_KEY` and `NEWSLETTER_FROM_EMAIL`, the digest sends to active subscribers.

The once-daily cron route is:

```text
/api/cron/daily
```

For manual local execution with a secret:

```bash
curl "http://localhost:3000/api/cron/daily?secret=$CRON_SECRET"
```

## Uploads

Protected upload endpoint:

```text
POST /api/uploads
```

Multipart fields:

- `file`
- `directory`
- `filenameBase`

Behavior:

- uses Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured
- falls back to `public/uploads` locally
- validates file type and size

## Testing

Unit tests:

```bash
npm test
```

Critical browser tests:

```bash
npm run test:e2e
```

Full verify:

```bash
npm run verify
```

## Deployment flow

Local Vercel config is in [vercel.json](vercel.json).

Expected deployment sequence:

```bash
npx vercel link
npx vercel env pull
npx vercel
npx vercel --prod
```

If the production URL changes, update Cognito callbacks:

```bash
PRODUCTION_URL=https://your-production-domain.vercel.app \
./scripts/update-cognito-callbacks.sh
```

## Notes

- Public pages are cache-aware and tolerate missing DB connectivity during build by falling back to empty states.
- Organizer and admin pages remain server-protected.
- The repo includes local development auth, but production auth is Cognito OIDC.
