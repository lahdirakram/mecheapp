-- PRIVACY: a generated image is the user's face on a new haircut — it is just as sensitive as
-- the source selfie and must never be world-readable. Flip the `generated` bucket to private and
-- restrict it to the owner (files live under a folder named after the user's uid, like selfies).
-- Generated images are now served to the client via short-lived signed URLs.
update storage.buckets set public = false where id = 'generated';

drop policy if exists generated_read on storage.objects;

create policy generated_rw_own on storage.objects for all
  using (bucket_id = 'generated' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'generated' and (storage.foldername(name))[1] = auth.uid()::text);
