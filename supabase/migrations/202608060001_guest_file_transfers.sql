-- App Store guideline 5.1.1(v): file transfer works without account creation.
-- Guest ownership is an opaque browser-scoped UUID; no personal information
-- is collected. Account-only history, analytics, and team features remain
-- tied to authenticated users through the existing RLS policies.

alter table public.shared_files
  add column if not exists guest_id uuid,
  alter column sender_email drop not null;

alter table public.shared_files
  drop constraint if exists shared_files_owner_check;

alter table public.shared_files
  add constraint shared_files_owner_check
    check (
      (sender_email is not null and guest_id is null)
      or (sender_email is null and guest_id is not null)
    );

create index if not exists shared_files_guest_idx
  on public.shared_files (guest_id, created_at desc)
  where guest_id is not null;

alter table public.pending_uploads
  add column if not exists guest_id uuid,
  alter column user_id drop not null;

alter table public.pending_uploads
  drop constraint if exists pending_uploads_owner_check;

alter table public.pending_uploads
  add constraint pending_uploads_owner_check
    check (num_nonnulls(user_id, guest_id) = 1);

create index if not exists pending_uploads_guest_idx
  on public.pending_uploads (guest_id, expires_at)
  where guest_id is not null;

