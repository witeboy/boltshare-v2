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

## Large transfers and retention

New uploads use Cloudflare R2 multipart uploads directly from the browser. File bytes do not pass through Vercel Functions, so BoltShare has no application-level proxy limit. Part sizing scales automatically up to R2's approximately 4.995 TiB object limit, unless `MAX_TRANSFER_BYTES` sets a lower operational ceiling.

Every transfer is fixed to a 48-hour lifetime. The cleanup job removes the stored object, the `shared_files` row, and its cascading `download_logs` rows. Existing Supabase Storage and Bunny-backed transfers remain readable and deletable during the transition.

See [`docs/storage-and-retention.md`](docs/storage-and-retention.md) for the required Cloudflare, Supabase, Vercel, migration, and legacy-provider configuration.
