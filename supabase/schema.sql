-- NexSocial database schema (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  persona_name text not null,
  ig_username text not null,
  ig_business_account_id text not null unique,
  access_token_encrypted text not null,
  token_expires_at timestamptz not null,
  profile_picture_url text,
  status text not null default 'active' check (status in ('active', 'error')),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  video_url text not null,
  caption text not null default '',
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'processing', 'published', 'failed')),
  ig_container_id text,
  ig_media_id text,
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists posts_status_scheduled_at_idx on posts (status, scheduled_at);
create index if not exists posts_account_id_idx on posts (account_id);

create table if not exists account_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  date date not null,
  followers_count integer,
  impressions integer,
  reach integer,
  profile_views integer,
  created_at timestamptz not null default now(),
  unique (account_id, date)
);

create table if not exists post_analytics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  reach integer,
  plays integer,
  fetched_at timestamptz not null default now()
);

create index if not exists post_analytics_post_id_idx on post_analytics (post_id);
