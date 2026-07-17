# BoltShare v2

BoltShare is a Next.js PWA for secure, expiring file transfers. The production web app is also loaded by a separate Capacitor wrapper through `server.url`.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Authentication

BoltShare uses email one-time passwords only. Users enter their email, receive a numeric code, and enter that code in the app. There is no magic-link or callback flow.

See [`docs/authentication-setup.md`](docs/authentication-setup.md) for the exact Supabase templates and dashboard settings.

## Database

Apply the SQL migrations in [`supabase/migrations`](supabase/migrations) to the connected Supabase project before using transfers, analytics, or teams.
