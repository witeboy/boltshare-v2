-- New uploads use Cloudflare R2. Existing Bunny and Supabase objects remain
-- readable and deletable until their existing 48-hour expiry.
alter table public.shared_files
  alter column storage_provider set default 'r2';

alter table public.shared_files
  drop constraint if exists shared_files_storage_provider_check,
  drop constraint if exists shared_files_storage_location_check;

alter table public.shared_files
  add constraint shared_files_storage_provider_check
    check (storage_provider in ('bunny', 'supabase', 'r2')),
  add constraint shared_files_storage_location_check
    check (
      (storage_provider = 'bunny' and file_url is not null)
      or (storage_provider in ('supabase', 'r2') and storage_path is not null)
    );

alter table public.pending_uploads
  add column if not exists storage_provider text,
  add column if not exists upload_id text,
  add column if not exists part_size bigint;

-- Rows created by the prior Supabase TUS implementation are kept compatible.
update public.pending_uploads
set storage_provider = 'supabase'
where storage_provider is null;

alter table public.pending_uploads
  alter column storage_provider set default 'r2',
  alter column storage_provider set not null;

alter table public.pending_uploads
  drop constraint if exists pending_uploads_storage_provider_check,
  drop constraint if exists pending_uploads_storage_details_check;

alter table public.pending_uploads
  add constraint pending_uploads_storage_provider_check
    check (storage_provider in ('supabase', 'r2')),
  add constraint pending_uploads_storage_details_check
    check (
      storage_provider = 'supabase'
      or (
        storage_provider = 'r2'
        and upload_id is not null
        and part_size is not null
        and part_size > 0
      )
    );
