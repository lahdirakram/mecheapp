-- Saved looks can carry the generated image (shown in "Mes mèches").
alter table looks add column if not exists image_url text;
