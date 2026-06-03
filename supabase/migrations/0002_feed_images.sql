-- Real photos for the inspiration feed (replaces the MPortrait gradient placeholders).
alter table feed_items add column if not exists image_url text;
