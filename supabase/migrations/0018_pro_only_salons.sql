-- Strict account separation: only `pro` profiles may create or update salons. A B2C account
-- signing into the pro app is blocked in the UI, and this makes the DB agree — it can never
-- own a salon even by calling the API directly.
drop policy if exists salons_write_owner on salons;
create policy salons_write_owner on salons for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'pro')
  );
