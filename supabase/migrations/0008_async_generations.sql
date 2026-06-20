-- Background (async) try-on generations.
--
-- The /generate Edge Function used to run Gemini inline and only return once the image was ready,
-- so leaving the loader threw the result away (and on mobile the request could be killed when the
-- app backgrounded). It now reserves the credit, inserts a PENDING generation + its wardrobe look,
-- returns immediately, and finishes the AI work in the background (EdgeRuntime.waitUntil). The look
-- then lands in "Mes mèches" on its own, whether or not the user is still watching.

-- status drives the wardrobe card: 'pending' shows a generating placeholder, 'done' the image.
-- 'failed' rows are kept for audit but their look row is removed (and the credit refunded), so they
-- never surface. Default 'done' so every pre-existing generation stays valid.
alter table generations add column if not exists status text not null default 'done'
  check (status in ('pending', 'done', 'failed'));
alter table generations add column if not exists error text;

-- Small partial index for sweeping a user's in-flight looks.
create index if not exists generations_pending_idx on generations (user_id) where status = 'pending';
