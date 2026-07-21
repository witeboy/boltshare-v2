# Storage and 48-hour retention

## Architecture

New transfers use a private Cloudflare R2 bucket. Vercel Functions are the authenticated control plane and never proxy file bytes:

1. `/api/uploads/authorize` creates a private R2 multipart upload and records it in `pending_uploads`.
2. `/api/uploads/part-urls` issues short-lived, object-scoped URLs in batches of up to 50.
3. The browser uploads up to four parts concurrently, retries interrupted parts with fresh URLs, and reports aggregate progress.
4. `/api/uploads/complete` completes the multipart upload, verifies the final byte count with R2, and creates the transfer record.
5. `/api/download` validates the share, password, expiry, and download limit, then returns a 60-second signed R2 download URL.

Part size starts at 32 MiB and increases automatically so an object never exceeds R2's 10,000-part limit. The application defaults to R2's object-size ceiling (approximately 4.995 TiB). `MAX_TRANSFER_BYTES` can impose a lower operational ceiling without a code change.

Upload authorizations expire after 24 hours. The cleanup job aborts unfinished R2 multipart uploads, removes any object left by a partially completed flow, and deletes the pending row. A maximum of five concurrent pending uploads per user limits abandoned-upload abuse.

Rows created before the R2 migration continue to use Supabase Storage or Bunny Storage until they expire or are deleted.

## Required Cloudflare configuration

1. Create a private Standard-class bucket named `boltshare-transfers`.
2. Create an R2 S3 API token scoped only to this bucket with Object Read & Write access.
3. Set bucket CORS to allow `GET`, `HEAD`, and `PUT` from `https://boltshare.rcinc.app`, allow all request headers, and expose `ETag`.
4. Add an object lifecycle rule that expires objects after two days and aborts incomplete multipart uploads after one day. This is a storage-level safety net; the database and hourly cleanup job remain authoritative for exact expiry.

## Required deployment configuration

Set these server-only Vercel variables in Production:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=boltshare-transfers`
- `MAX_TRANSFER_BYTES` only when a lower-than-R2 limit is desired

Keep the Supabase variables for authentication and transfer metadata. Keep the Bunny variables while any legacy rows exist.

Apply both storage migrations in order:

1. `202607200001_large_transfers_and_48h_expiry.sql`
2. `202607210001_cloudflare_r2_storage.sql`

## Retention

The database trigger fixes every transfer's `expires_at` to exactly 48 hours after creation. Downloads are rejected immediately at that time. The GitHub Actions scheduler calls the cleanup endpoint hourly, and the daily Vercel cron is a fallback. The R2 two-day lifecycle rule independently prevents orphaned objects from remaining indefinitely; Cloudflare lifecycle deletion can occur later than the exact application expiry.

## Operational checks

- Confirm the bucket is private and the API token is bucket-scoped.
- Confirm browser upload requests go directly to `*.r2.cloudflarestorage.com`.
- Confirm upload responses expose `ETag`; multipart completion cannot succeed without it.
- Confirm `/api/download` returns a small JSON response and the file request goes directly to R2.
- Run the cleanup workflow manually after each credentials or deployment change.
