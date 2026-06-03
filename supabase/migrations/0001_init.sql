-- Mèche & Mèche Pro — core schema, RLS, storage, and the B2B↔B2C bridge.
-- Conventions: every table has RLS enabled. Writes that must not be forgeable by clients
-- (credit grants, subscription state) have NO client policy and are performed by Edge
-- Functions using the service role (which bypasses RLS).

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role         as enum ('b2c', 'pro');
create type feed_source       as enum ('studio', 'salon', 'user');
create type hair_shape        as enum ('short', 'medium', 'long', 'curly', 'pixie', 'bob');
create type request_status    as enum ('new', 'replied', 'booked', 'declined');
create type booking_status    as enum ('confirmed', 'live', 'pending');
create type subscription_plan as enum ('solo', 'salon', 'maison');

-- ─── Identity ─────────────────────────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  handle       text unique,
  lang         text not null default 'fr' check (lang in ('fr', 'en')),
  role         user_role not null default 'b2c',
  member_since text not null default to_char(now(), 'YYYY'),
  created_at   timestamptz not null default now()
);
alter table profiles enable row level security;

-- ─── B2C ──────────────────────────────────────────────────────────────────────
create table credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  delta      integer not null,            -- +N on purchase/grant, -1 on generation
  reason     text not null,               -- 'free_trial' | 'purchase' | 'generation'
  pack_id    text,
  created_at timestamptz not null default now()
);
alter table credit_transactions enable row level security;
create index credit_tx_user_idx on credit_transactions (user_id);

create table generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  selfie_path text,
  brief       jsonb not null default '{}'::jsonb,
  result_path text,
  match       integer,
  source      feed_source,
  created_at  timestamptz not null default now()
);
alter table generations enable row level security;
create index generations_user_idx on generations (user_id);

create table looks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  name          text not null,
  hair          hair_shape not null default 'medium',
  mood          text not null default 'warm',
  loved         boolean not null default false,
  tag           text,
  generation_id uuid references generations (id) on delete set null,
  created_at    timestamptz not null default now()
);
alter table looks enable row level security;
create index looks_user_idx on looks (user_id);

create table credit_packs (
  id      text primary key,              -- 'taste' | 'star' | 'pro'
  credits integer not null,
  price   text not null,
  unit    text not null,
  badge   text
);
alter table credit_packs enable row level security;

-- ─── Marketplace ────────────────────────────────────────────────────────────
create table salons (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references profiles (id) on delete set null,
  name       text not null,
  area       text,
  created_at timestamptz not null default now()
);
alter table salons enable row level security;

create table stylists (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references salons (id) on delete cascade,
  profile_id uuid references profiles (id) on delete set null,
  name       text not null,
  area       text,
  rating     numeric(2, 1) default 0,
  reviews    integer default 0,
  price      text default '€€',
  open       boolean default true,
  created_at timestamptz not null default now()
);
alter table stylists enable row level security;
create index stylists_salon_idx on stylists (salon_id);

create table services (
  id           uuid primary key default gen_random_uuid(),
  salon_id     uuid not null references salons (id) on delete cascade,
  name         text not null,
  duration_min integer default 60,
  price_est    text
);
alter table services enable row level security;

create table portfolio_items (
  id                  uuid primary key default gen_random_uuid(),
  stylist_id          uuid not null references stylists (id) on delete cascade,
  name                text not null,
  hair                hair_shape default 'medium',
  mood                text default 'warm',
  loves               integer default 0,
  bookings_generated  integer default 0,
  image_path          text,
  created_at          timestamptz not null default now()
);
alter table portfolio_items enable row level security;
create index portfolio_stylist_idx on portfolio_items (stylist_id);

create table subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references profiles (id) on delete cascade,
  salon_id           uuid references salons (id) on delete set null,
  plan               subscription_plan not null,
  status             text not null default 'active',
  current_period_end timestamptz,
  rc_entitlement     text,
  created_at         timestamptz not null default now()
);
alter table subscriptions enable row level security;

-- ─── Feed (multi-source inspiration) ──────────────────────────────────────────
create table feed_items (
  id         uuid primary key default gen_random_uuid(),
  kind       feed_source not null,
  name       jsonb not null,             -- { fr, en }
  tag        jsonb,
  hair       hair_shape default 'medium',
  mood       text default 'warm',
  loves      text,
  descr      jsonb,
  label      jsonb,
  by         jsonb,
  match      integer,
  stylist_id uuid references stylists (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table feed_items enable row level security;

-- ─── The bridge: B2C generation → Pro inbox ───────────────────────────────────
create table requests (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references profiles (id) on delete cascade,
  to_stylist_id uuid not null references stylists (id) on delete cascade,
  generation_id uuid references generations (id) on delete set null,
  image_path    text,
  dossier       jsonb not null default '{}'::jsonb,  -- { currentLength, baseColor, targetColor, estBudget }
  confidence    integer,
  unread        boolean not null default true,
  status        request_status not null default 'new',
  created_at    timestamptz not null default now()
);
alter table requests enable row level security;
create index requests_stylist_idx on requests (to_stylist_id);
create index requests_user_idx on requests (from_user_id);

create table messages (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references requests (id) on delete cascade,
  sender_id     uuid not null references profiles (id) on delete cascade,
  body          text,
  proposed_slot timestamptz,
  created_at    timestamptz not null default now()
);
alter table messages enable row level security;
create index messages_request_idx on messages (request_id);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  stylist_id     uuid not null references stylists (id) on delete cascade,
  request_id     uuid references requests (id) on delete set null,
  client_user_id uuid references profiles (id) on delete set null,
  status         booking_status not null default 'pending',
  starts_at      timestamptz not null,
  duration_min   integer not null default 60,
  service        text,
  match          integer,
  created_at     timestamptz not null default now()
);
alter table bookings enable row level security;
create index bookings_stylist_idx on bookings (stylist_id);

create table devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  expo_push_token text not null,
  platform        text,
  created_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
alter table devices enable row level security;

-- ─── Helpers ──────────────────────────────────────────────────────────────────

-- True if the current user is the pro who owns the salon this stylist belongs to.
create or replace function owns_stylist(p_stylist_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from stylists s
    join salons sa on sa.id = s.salon_id
    where s.id = p_stylist_id and sa.owner_id = auth.uid()
  );
$$;

-- Current user's credit balance (sum of transactions).
create or replace function my_credit_balance()
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from credit_transactions where user_id = auth.uid();
$$;

-- On signup: create the profile and, for B2C, grant the 1 free try credit.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'b2c');
begin
  insert into profiles (id, role, display_name, lang)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'lang', 'fr')
  );
  if v_role = 'b2c' then
    insert into credit_transactions (user_id, delta, reason) values (new.id, 1, 'free_trial');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── RLS policies ─────────────────────────────────────────────────────────────

-- profiles: read/update/insert own row
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_update_own on profiles for update using (id = auth.uid());
create policy profiles_insert_own on profiles for insert with check (id = auth.uid());

-- credit_transactions: read own only (grants happen server-side via service role)
create policy credit_tx_select_own on credit_transactions for select using (user_id = auth.uid());

-- generations: full CRUD on own
create policy generations_all_own on generations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- looks: full CRUD on own
create policy looks_all_own on looks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- credit_packs + feed_items: world-readable reference data
create policy credit_packs_read on credit_packs for select using (true);
create policy feed_items_read on feed_items for select using (true);

-- salons / stylists / services / portfolio: world-readable; written by the salon owner
create policy salons_read on salons for select using (true);
create policy salons_write_owner on salons for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy stylists_read on stylists for select using (true);
create policy stylists_write_owner on stylists for all
  using (exists (select 1 from salons sa where sa.id = salon_id and sa.owner_id = auth.uid()))
  with check (exists (select 1 from salons sa where sa.id = salon_id and sa.owner_id = auth.uid()));

create policy services_read on services for select using (true);
create policy services_write_owner on services for all
  using (exists (select 1 from salons sa where sa.id = salon_id and sa.owner_id = auth.uid()))
  with check (exists (select 1 from salons sa where sa.id = salon_id and sa.owner_id = auth.uid()));

create policy portfolio_read on portfolio_items for select using (true);
create policy portfolio_write_owner on portfolio_items for all
  using (owns_stylist(stylist_id)) with check (owns_stylist(stylist_id));

-- subscriptions: read own (state set server-side via RevenueCat webhook)
create policy subscriptions_select_own on subscriptions for select using (owner_id = auth.uid());

-- requests: client reads/creates own; pro (stylist owner) reads + updates
create policy requests_select_client on requests for select using (from_user_id = auth.uid());
create policy requests_insert_client on requests for insert with check (from_user_id = auth.uid());
create policy requests_select_pro on requests for select using (owns_stylist(to_stylist_id));
create policy requests_update_pro on requests for update using (owns_stylist(to_stylist_id));

-- messages: visible to both participants of the request
create policy messages_select_participant on messages for select using (
  exists (
    select 1 from requests r
    where r.id = request_id and (r.from_user_id = auth.uid() or owns_stylist(r.to_stylist_id))
  )
);
create policy messages_insert_participant on messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from requests r
    where r.id = request_id and (r.from_user_id = auth.uid() or owns_stylist(r.to_stylist_id))
  )
);

-- bookings: client reads own; pro reads + writes for owned stylist
create policy bookings_select_client on bookings for select using (client_user_id = auth.uid());
create policy bookings_rw_pro on bookings for all
  using (owns_stylist(stylist_id)) with check (owns_stylist(stylist_id));

-- devices: full CRUD on own
create policy devices_all_own on devices for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Storage buckets + policies ───────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('selfies', 'selfies', false),
  ('generated', 'generated', true),
  ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- selfies: private — a user may only touch files under a folder named after their uid.
create policy selfies_rw_own on storage.objects for all
  using (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'selfies' and (storage.foldername(name))[1] = auth.uid()::text);

-- generated + portfolio: world-readable; writes done server-side (service role).
create policy generated_read on storage.objects for select using (bucket_id = 'generated');
create policy portfolio_read on storage.objects for select using (bucket_id = 'portfolio');
