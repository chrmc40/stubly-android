-- Clean slate: Drop everything (ignore errors if they don't exist)
do $$
begin
  execute 'drop table if exists public.profiles cascade';
  execute 'drop table if exists public.subscription_tiers cascade';
  execute 'drop trigger if exists on_auth_user_created on auth.users';
  execute 'drop function if exists public.handle_new_user() cascade';
  execute 'drop function if exists public.handle_updated_at() cascade';
  execute 'drop function if exists public.check_storage_quota(uuid)';
  execute 'drop function if exists public.check_file_quota(uuid)';
  execute 'drop function if exists public.is_subscription_active(uuid)';
  execute 'drop function if exists public.record_dmca_strike(uuid)';
exception when others then
  null; -- Ignore all errors
end $$;

-- Create subscription_tiers
create table public.subscription_tiers (
  tier_id serial primary key,
  tier_name text unique not null,
  google_play_product_id text unique,
  storage_quota_bytes bigint not null,
  file_count_quota integer not null,
  price_monthly integer,
  price_yearly integer,
  is_active boolean default true,
  create_date timestamptz default now(),
  modified_date timestamptz default now()
);

-- Insert tiers
insert into public.subscription_tiers (tier_name, google_play_product_id, storage_quota_bytes, file_count_quota, price_monthly, price_yearly) values
  ('free', null, 1073741824, 100, null, null),
  ('basic', 'basic_monthly', 10737418240, 1000, 299, 2990),
  ('premium', 'premium_monthly', 107374182400, 10000, 999, 9990),
  ('enterprise', 'enterprise_monthly', 1099511627776, 100000, 4999, 49990);

-- Create profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  android_id text,
  is_anonymous boolean default false,
  tier_id integer references public.subscription_tiers(tier_id) default 1,
  google_play_token text,
  google_play_order_id text,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  storage_used_bytes bigint default 0,
  file_count_used integer default 0,
  dmca_strike_count integer default 0,
  dmca_strike_date timestamptz,
  account_status text default 'active' check (account_status in ('active', 'suspended', 'banned')),
  encryption_enabled boolean default false,
  create_date timestamptz default now(),
  modified_date timestamptz default now()
);

-- Enable RLS
alter table public.subscription_tiers enable row level security;
alter table public.profiles enable row level security;

-- Policies
create policy "tiers_select" on public.subscription_tiers for select using (is_active = true);
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Functions
create or replace function public.handle_updated_at() returns trigger as $$
begin
  new.modified_date = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_new_user() returns trigger as $$
declare
  free_tier_id integer;
begin
  select tier_id into free_tier_id from public.subscription_tiers where tier_name = 'free' limit 1;
  insert into public.profiles (id, username, email, android_id, is_anonymous, tier_id, account_status, encryption_enabled)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email,
    new.raw_user_meta_data->>'android_id',
    coalesce((new.raw_user_meta_data->>'is_anonymous')::boolean, false),
    coalesce(free_tier_id, 1),
    'active',
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- Triggers
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_updated_at_tiers before update on public.subscription_tiers for each row execute function public.handle_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Verify
select 'DONE' as status;
select * from public.subscription_tiers;
