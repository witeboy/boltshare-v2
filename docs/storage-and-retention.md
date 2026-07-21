# Storage and 48-hour retention

## Architecture

Vercel Functions enforce a 4.5 MB request/response payload limit, so they are used only as the authenticated control plane:

1. `/api/uploads/authorize` creates a short-lived signed upload token for a private Supabase Storage path.
2. The browser uploads the file in 6 MB TUS chunks directly to Supabase Storage, with retry and progress handling.
3. `/api/uploads/complete` verifies the stored object's path and byte count before creating the transfer record.
4. `/api/download` validates the share, password, expiry, and download limit, then returns a 60-second signed Storage URL. File bytes download directly from Storage.

Upload authorizations are recorded in `pending_uploads`. If a browser completes an object but abandons the flow before the transfer record is created, the cleanup job removes its object and pending record after 24 hours. Supabase expires unfinished TUS upload URLs after 24 hours. Together these prevent unreferenced uploads from accumulating.

New files use the private `transfers` Supabase Storage bucket. Rows created before this migration continue to use Bunny Storage until they expire or are deleted.

## Required deployment steps

1. Apply `supabase/migrations/202607200001_large_transfers_and_48h_expiry.sql` after the core migration. It creates the private bucket, adds provider/path metadata, shortens any longer-lived existing transfer to 48 hours, and enforces the 48-hour lifetime in the database.
2. In Supabase **Storage Settings**, raise the global maximum file size to the largest size the deployment should accept. The migration leaves the `transfers` bucket without a smaller per-bucket limit. The Supabase plan, global setting, quota, and TUS service remain the infrastructure limits.
3. Keep `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel. The service-role key must remain server-only.
4. Set `CRON_SECRET` in Vercel to a random value of at least 16 characters. Vercel automatically sends it as a Bearer token to the cleanup route.
5. For physical deletion within about one hour of the 48-hour expiry, invoke `GET /api/cleanup-expired-files` hourly from an external scheduler with `Authorization: Bearer <CRON_SECRET>`, or change `vercel.json` to an hourly schedule after upgrading to Vercel Pro or Enterprise. The committed daily schedule is a deployable fallback for Vercel Hobby, which rejects hourly cron expressions.
6. Keep the Bunny variables while any pre-migration rows exist: `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_HOST`, `BUNNY_STORAGE_PASSWORD`, and `BUNNY_CDN_HOSTNAME`. They can be removed after all legacy rows have expired and cleanup has succeeded.

Access is rejected immediately once `expires_at` reaches exactly 48 hours. With the recommended hourly scheduler, physical deletion normally follows within one hour. The committed Vercel Hobby fallback runs daily, so physical deletion can otherwise occur up to 24 hours later.

## Operational checks

- Confirm the `transfers` bucket is private.
- Test with a file larger than 4.5 MB and verify that browser network traffic sends TUS `PATCH` requests to `*.storage.supabase.co`, not to the Vercel app.
- Confirm `/api/download` returns a small JSON response and the file request goes directly to Supabase Storage.
- Check the Vercel Cron Jobs page and function logs after deployment. Vercel does not retry failed cron invocations, but the next hourly run safely retries remaining expired rows.
