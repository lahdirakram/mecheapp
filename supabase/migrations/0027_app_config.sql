-- Remote-readable app flags. Needed because LOCKED_FIRST_TRY as an env var was invisible to the
-- client: flipping the server switch left old copy on devices ("1 crédit" vs teaser reality). One
-- world-readable row now drives BOTH `generate` (which falls back to it when the env var is unset)
-- and the client presentation (credits display, pre-generate caption), so the experience switches
-- as a whole with a single SQL update — no function redeploy, no OTA.
create table if not exists app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
-- Read-only reference data, like credit_packs: everyone reads, only service_role writes (no write
-- policy = RLS refusal — locked by Postgres, not app code).
create policy app_config_read_all on app_config for select using (true);
grant select on app_config to anon, authenticated;

-- locked_first_try: '' or '0' = off, '1' = respect the client supportsLocked flag, 'force' = lock
-- every eligible generation. The LOCKED_FIRST_TRY env var on `generate`, when set, overrides this
-- row (emergency lever); normal operation keeps the env unset and flips this row instead:
--   update app_config set value = '0', updated_at = now() where key = 'locked_first_try';
insert into app_config (key, value) values ('locked_first_try', '1')
  on conflict (key) do nothing;
