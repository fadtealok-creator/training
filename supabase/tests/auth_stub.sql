-- Minimal stand-in for Supabase's auth schema so migrations run on plain Postgres in CI.
create extension if not exists pgcrypto;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.uid', true), '')::uuid
$$;
