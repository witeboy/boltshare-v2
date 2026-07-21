-- Store new transfers in a private Supabase Storage bucket. File bytes travel
-- directly between the browser and Storage; Vercel only authorizes the upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('transfers', 'transfers', false, null, null)
on conflict (id) do update
set public = false,
    file_size_limit = null,
    allowed_mime_types = null;

alter table public.shared_files
  add column if not exists storage_provider text,
  add column if not exists storage_path text;

update public.shared_files
set storage_provider = case when bunny_path is not null then 'bunny' else 'supabase' end
where storage_provider is null;

alter table public.shared_files
  alter column storage_provider set default 'bunny',
  alter column storage_provider set not null,
  alter column file_url drop not null,
  alter column expiry_hours set default 48;

alter table public.shared_files
  drop constraint if exists shared_files_storage_provider_check,
  drop constraint if exists shared_files_storage_location_check,
  drop constraint if exists shared_files_expiry_hours_check;

-- Existing transfers are shortened when necessary so no file remains beyond
-- 48 hours from its original upload time.
update public.shared_files
set expires_at = least(expires_at, created_at + interval '48 hours'),
    expiry_hours = 48;

alter table public.shared_files
  alter column expiry_hours set not null;

alter table public.shared_files
  add constraint shared_files_storage_provider_check
    check (storage_provider in ('bunny', 'supabase')),
  add constraint shared_files_storage_location_check
    check (
      (storage_provider = 'bunny' and file_url is not null)
      or (storage_provider = 'supabase' and storage_path is not null)
    ),
  add constraint shared_files_expiry_hours_check
    check (expiry_hours = 48);

create unique index if not exists shared_files_storage_path_idx
  on public.shared_files (storage_path)
  where storage_path is not null;

create table if not exists public.pending_uploads (
  object_path text primary key,
  user_id uuid not null,
  expected_size bigint not null check (expected_size > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists pending_uploads_expiry_idx
  on public.pending_uploads (expires_at);

alter table public.pending_uploads enable row level security;
revoke all on public.pending_uploads from anon, authenticated;

create or replace function public.enforce_shared_file_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.expires_at := new.created_at + interval '48 hours';
  else
    new.created_at := old.created_at;
    new.expires_at := old.expires_at;
  end if;

  new.expiry_hours := 48;
  return new;
end;
$$;

drop trigger if exists enforce_shared_file_expiry on public.shared_files;
create trigger enforce_shared_file_expiry
before insert or update on public.shared_files
for each row execute function public.enforce_shared_file_expiry();

revoke all on function public.enforce_shared_file_expiry() from public;
