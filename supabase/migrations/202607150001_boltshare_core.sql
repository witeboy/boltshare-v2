create extension if not exists pgcrypto;

create table if not exists public.shared_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null default 'application/octet-stream',
  file_url text not null,
  file_size bigint not null check (file_size > 0),
  bunny_path text,
  share_token text not null check (share_token ~ '^[A-Z2-9]{10}$'),
  sender_email text not null,
  recipient_email text,
  expires_at timestamptz not null,
  expiry_hours integer,
  max_downloads integer check (max_downloads is null or max_downloads > 0),
  download_count integer not null default 0 check (download_count >= 0),
  password_hash text,
  status text not null default 'active' check (status in ('active', 'expired', 'deleted')),
  share_method text not null default 'link',
  notify_on_download boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.shared_files(id) on delete cascade,
  ip_address text,
  user_agent text,
  receiver_email text,
  downloaded_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_email text,
  created_at timestamptz not null default now()
);

alter table public.organizations add column if not exists created_by_email text;

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_email)
);

create index if not exists shared_files_token_idx on public.shared_files (share_token);
create index if not exists shared_files_sender_idx on public.shared_files (lower(sender_email), created_at desc);
create index if not exists shared_files_expiry_idx on public.shared_files (status, expires_at);
create index if not exists download_logs_file_idx on public.download_logs (file_id, downloaded_at desc);
create index if not exists org_members_email_idx on public.org_members (lower(user_email));

alter table public.shared_files enable row level security;
alter table public.download_logs enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where organization_id = target_org
      and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.org_members
    where organization_id = target_org
      and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.org_has_no_members(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.org_members where organization_id = target_org
  );
$$;

drop policy if exists "owners read shared files" on public.shared_files;
drop policy if exists "file_delete" on public.shared_files;
drop policy if exists "file_insert" on public.shared_files;
drop policy if exists "file_select_public" on public.shared_files;
drop policy if exists "file_update" on public.shared_files;
create policy "owners read shared files" on public.shared_files for select to authenticated
using (lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "owners manage shared files" on public.shared_files;
create policy "owners manage shared files" on public.shared_files for all to authenticated
using (lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
with check (lower(sender_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "owners read download logs" on public.download_logs;
drop policy if exists "log_insert_public" on public.download_logs;
drop policy if exists "log_select" on public.download_logs;
create policy "owners read download logs" on public.download_logs for select to authenticated
using (exists (
  select 1 from public.shared_files sf
  where sf.id = download_logs.file_id
    and lower(sf.sender_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
));

drop policy if exists "members read organizations" on public.organizations;
drop policy if exists "org_insert" on public.organizations;
drop policy if exists "org_select" on public.organizations;
drop policy if exists "org_update" on public.organizations;
create policy "members read organizations" on public.organizations for select to authenticated
using (
  public.is_org_member(id)
  or lower(created_by_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users create organizations" on public.organizations;
create policy "users create organizations" on public.organizations for insert to authenticated
with check (lower(created_by_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "admins update organizations" on public.organizations;
create policy "admins update organizations" on public.organizations for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

drop policy if exists "members read memberships" on public.org_members;
drop policy if exists "member_delete" on public.org_members;
drop policy if exists "member_insert" on public.org_members;
drop policy if exists "member_select" on public.org_members;
create policy "members read memberships" on public.org_members for select to authenticated
using (
  lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_org_member(organization_id)
);

drop policy if exists "users create first membership" on public.org_members;
create policy "users create first membership" on public.org_members for insert to authenticated
with check (
  (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and public.org_has_no_members(organization_id)
  )
  or public.is_org_admin(organization_id)
);

drop policy if exists "admins manage memberships" on public.org_members;
create policy "admins manage memberships" on public.org_members for update to authenticated
using (public.is_org_admin(organization_id));

drop policy if exists "admins remove memberships" on public.org_members;
create policy "admins remove memberships" on public.org_members for delete to authenticated
using (
  lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_org_admin(organization_id)
);

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.org_has_no_members(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.org_has_no_members(uuid) to authenticated;

revoke all on public.shared_files from anon;
revoke all on public.download_logs from anon;
revoke all on public.organizations from anon;
revoke all on public.org_members from anon;
grant select, insert, update, delete on public.shared_files to authenticated;
grant select on public.download_logs to authenticated;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.org_members to authenticated;
