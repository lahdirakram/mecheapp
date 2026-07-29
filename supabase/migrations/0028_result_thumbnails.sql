-- Egress: the wardrobe grid and the profile strip rendered the FULL result (a ~2 MB PNG) inside boxes
-- 100 to 180px wide, once per look. A dedicated 420px JPEG thumbnail written at generation time costs
-- ~18 KB, so opening a grid of twenty looks drops from ~42 MB to under 1 MB.
--
-- Additive and backward-compatible: old clients ignore the column and keep reading result_path, which
-- still points at the full image. Rows generated before this migration have thumb_path null and the
-- client falls back to result_path for them, so there is nothing to backfill.
alter table generations add column if not exists thumb_path text;

-- Both functions below are REPLACED, not redefined: same signature, same return type, same search_path
-- as their originals (0021 / 0025). They only learn about the new column. Changing a return type here
-- would fail outright, and dropping them would break the cron job and the client RPC that call them.

-- 0021: the only write the client gets on `generations`, used when a look is deleted. It must clear
-- the thumbnail too, otherwise a deleted look leaves a live path to a file that was just removed.
create or replace function forget_generation_media(p_gen uuid)
returns boolean language sql security definer set search_path = public as $$
  update generations
     set selfie_path = null, result_path = null, thumb_path = null
   where id = p_gen and user_id = auth.uid()
  returning true;
$$;
revoke all on function forget_generation_media(uuid) from public, anon;
grant execute on function forget_generation_media(uuid) to authenticated;

-- 0025: nulls paths whose storage object is gone (the delete-files-then-null-paths pair is not
-- atomic). Same prudence as the original: only rows whose file is CONFIRMED absent, never a pending
-- generation, and the row itself always survives as the receipt of the spent credit.
create or replace function private.reconcile_orphan_paths()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.generations g
     set selfie_path = case
           when g.selfie_path is not null and not exists (
             select 1 from storage.objects o where o.bucket_id = 'selfies' and o.name = g.selfie_path
           ) then null else g.selfie_path end,
         result_path = case
           when g.result_path is not null and not exists (
             select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.result_path
           ) then null else g.result_path end,
         thumb_path = case
           when g.thumb_path is not null and not exists (
             select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.thumb_path
           ) then null else g.thumb_path end
   where g.status <> 'pending'
     and (
       (g.selfie_path is not null and not exists (
          select 1 from storage.objects o where o.bucket_id = 'selfies' and o.name = g.selfie_path))
       or
       (g.result_path is not null and not exists (
          select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.result_path))
       or
       (g.thumb_path is not null and not exists (
          select 1 from storage.objects o where o.bucket_id = 'generated' and o.name = g.thumb_path))
     );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function private.reconcile_orphan_paths() from public, anon, authenticated;
grant execute on function private.reconcile_orphan_paths() to service_role;
