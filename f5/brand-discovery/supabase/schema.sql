-- Brand Discovery: run once in the Supabase SQL editor (or as a migration).
-- Only the Edge Function (service role) can read or write this data.

create table if not exists public.brand_discovery_submissions (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  folder            uuid not null unique,          -- also the Storage folder for this person's files
  status            text not null default 'new',   -- new | contacted | won | lost (yours to use)
  email             text not null,
  first_name        text not null,
  last_name         text,
  business_name     text not null,
  phone             text,
  website           text,
  data              jsonb not null,                -- every raw answer
  summary           jsonb not null default '[]',   -- the readable version: [{section,label,value}]
  files             jsonb not null default '[]',
  meta              jsonb not null default '{}',
  owner_emailed     boolean not null default false,
  confirmation_sent boolean not null default false,
  email_errors      text
);

create index if not exists brand_discovery_created_idx on public.brand_discovery_submissions (created_at desc);
create index if not exists brand_discovery_email_idx   on public.brand_discovery_submissions (email, created_at desc);

alter table public.brand_discovery_submissions enable row level security;
revoke all on public.brand_discovery_submissions from anon, authenticated;
-- No policies on purpose: the public API keys can't touch this table.

-- Private bucket for logos and materials (25 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-discovery', 'brand-discovery', false, 26214400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit, public = false;
