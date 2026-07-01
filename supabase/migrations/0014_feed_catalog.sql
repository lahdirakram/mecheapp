-- Foundation for the AI-generated inspiration feed.
-- Adds:
--   1) haircut_catalog — the curated style taxonomy the generator draws from (the editorial backbone;
--      also reusable by /suggest and any future style browser).
--   2) generation + curation columns on feed_items — a status gate (draft until a human approves) and
--      gen_meta (the reproducible recipe: sampled axes, prompt, model, seed, cost).
--   3) a public `feed` storage bucket for generated portraits (feed content is world-readable, unlike
--      the private `selfies` bucket).
--   4) a status filter on feed_for_user so only `published` items ever reach the app.
-- Generation is run by a private admin script using the service role, so — exactly like feed_items
-- today — there is NO client write policy on any of this. Clients can only read.

-- ─── Haircut catalog (curated taxonomy) ───────────────────────────────────────
create table haircut_catalog (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,            -- stable id, e.g. 'curtain-shag'
  name           jsonb not null,                  -- { fr, en } display name
  descr          jsonb not null,                  -- { fr, en } short UI description
  prompt_hint    text not null,                   -- English hair phrase fed to the image model
  hair           hair_shape not null default 'medium',
  length         numeric check (length is null or (length >= 0 and length <= 1)),  -- maps to Brief.length
  tags           text[] not null default '{}',    -- 'bangs','layered','fade'...
  suits          text[] not null default '{}',    -- presentations: 'feminine','masculine','androgynous'
  color_hint     text,                            -- only when the style implies a colour
  trending_score integer not null default 0,      -- editorial 0..100
  active         boolean not null default true,   -- include in the generation rotation?
  created_at     timestamptz not null default now()
);
alter table haircut_catalog enable row level security;
-- World-readable reference data (like feed_items / credit_packs); writes are service-role only.
create policy haircut_catalog_read on haircut_catalog for select using (true);

-- ─── Feed item: generation + curation columns ─────────────────────────────────
-- status defaults to 'published' so every existing studio/salon/user item stays live; the generator
-- inserts new AI items as 'draft', and they only surface once flipped to 'published' after review.
alter table feed_items add column if not exists status text not null default 'published'
  check (status in ('draft', 'published', 'archived'));
alter table feed_items add column if not exists catalog_id uuid references haircut_catalog (id) on delete set null;
alter table feed_items add column if not exists gen_meta jsonb;   -- { axes, prompt, model, seed, cost_eur }
create index if not exists feed_items_status_idx on feed_items (status);

-- ─── Storage: public bucket for generated feed portraits ──────────────────────
insert into storage.buckets (id, name, public) values ('feed', 'feed', true)
on conflict (id) do nothing;
-- world-readable; writes done server-side (service role), like `generated` / `portfolio`.
create policy feed_read on storage.objects for select using (bucket_id = 'feed');

-- ─── Only published items reach the app ───────────────────────────────────────
-- Same body / signature / security model as 0012, plus a status filter so draft and archived
-- generations stay hidden until a human approves them.
create or replace function feed_for_user(
  p_limit   int default 10,
  p_seed    double precision default 0.5,
  p_exclude uuid[] default '{}'
) returns setof feed_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  perform setseed(greatest(-1.0, least(1.0, p_seed)));
  return query
  with saved as (
    select hair::text as hair, mood, tag from looks where user_id = v_user
  ),
  hair_aff as (select hair, count(*)::numeric n from saved where hair is not null group by hair),
  mood_aff as (select mood, count(*)::numeric n from saved where mood is not null group by mood),
  kind_aff as (select tag,  count(*)::numeric n from saved where tag  is not null group by tag)
  select f.*
  from feed_items f
  where f.status = 'published'
    and not (f.id = any(coalesce(p_exclude, '{}'::uuid[])))
  order by
    ( random()                                                                    -- dominant shuffle [0,1)
    + least(
        coalesce((select n from hair_aff h where h.hair = f.hair::text), 0) * 1.0
        + coalesce((select n from mood_aff m where m.mood = f.mood),      0) * 0.6
        + coalesce((select n from kind_aff k where k.tag  = f.kind::text), 0) * 0.8,
        5
      ) * 0.08                                                                    -- gentle, capped taste nudge
    - least(
        coalesce((select count(*) from feed_events e
                  where e.user_id = v_user and e.feed_item_id = f.id and e.kind = 'seen'),
                 0),
        5
      ) * 0.05                                                                    -- mild fatigue on re-seen
    ) desc
  limit greatest(1, least(50, p_limit));
end;
$$;
grant execute on function feed_for_user(int, double precision, uuid[]) to anon, authenticated;

-- ─── Seed: starter style catalog ──────────────────────────────────────────────
-- A curated ~30 to launch with. Idempotent (on conflict by slug) so re-pushing never duplicates;
-- trim or extend this list before pushing. descr/name are user-facing — no em dashes.
insert into haircut_catalog (slug, name, descr, prompt_hint, hair, length, tags, suits, trending_score) values
  ('blunt-bob',          '{"fr":"Carré net","en":"Blunt bob"}',                       '{"fr":"Carré net à la mâchoire, allure graphique","en":"Sharp jaw-length bob"}',                'a blunt jaw-length bob with a clean centre part',                    'bob',    0.35, array['blunt'],                  array['feminine','androgynous'],            78),
  ('french-bob',         '{"fr":"Carré français","en":"French bob"}',                 '{"fr":"Carré court avec frange, esprit parisien","en":"Short chin bob with bangs"}',            'a short chin-length french bob with soft baby bangs',                'bob',    0.30, array['bangs'],                  array['feminine'],                          82),
  ('italian-bob',        '{"fr":"Carré italien","en":"Italian bob"}',                 '{"fr":"Carré arrondi et brillant, volume léger","en":"Glossy rounded bob"}',                    'a glossy rounded italian bob with a soft inward curve',              'bob',    0.40, array['glossy'],                 array['feminine'],                          74),
  ('wavy-lob',           '{"fr":"Lob ondulé","en":"Wavy lob"}',                       '{"fr":"Long carré ondulé aux épaules","en":"Shoulder-length wavy lob"}',                        'a shoulder-length lob with loose beachy waves',                     'medium', 0.55, array['wavy'],                   array['feminine','androgynous'],            70),
  ('asymmetric-bob',     '{"fr":"Carré asymétrique","en":"Asymmetric bob"}',          '{"fr":"Carré plongeant, plus long devant","en":"Angled bob, longer in front"}',                'an angled asymmetric bob, longer at the front',                     'bob',    0.38, array['angled'],                 array['feminine','androgynous'],            61),
  ('curtain-shag',       '{"fr":"Shag frange rideau","en":"Curtain shag"}',           '{"fr":"Coupe effilée et vécue, frange rideau","en":"Layered lived-in shag, curtain bangs"}',    'a layered lived-in shag with face-framing curtain bangs',           'medium', 0.55, array['bangs','layered'],        array['feminine','androgynous'],            88),
  ('wolf-cut',           '{"fr":"Coupe loup","en":"Wolf cut"}',                       '{"fr":"Mélange mulet et shag, très texturé","en":"Shag-mullet hybrid, heavy texture"}',        'a textured wolf cut blending shag and mullet, choppy layers',       'medium', 0.50, array['layered','choppy'],       array['androgynous','feminine'],            85),
  ('textured-collarbone','{"fr":"Coupe clavicule","en":"Collarbone cut"}',            '{"fr":"Mi-long à hauteur de clavicule, mouvement","en":"Collarbone-length with movement"}',     'a collarbone-length cut with soft internal layers',                 'medium', 0.50, array['layered'],                array['feminine'],                          64),
  ('modern-shag',        '{"fr":"Shag moderne","en":"Modern shag"}',                  '{"fr":"Dégradé rock, frange effilée","en":"Rocker shag, wispy fringe"}',                        'a rock-inspired shag with wispy fringe and airy layers',            'medium', 0.50, array['layered','bangs'],        array['androgynous','feminine'],            67),
  ('curtain-bang-layers','{"fr":"Dégradé frange rideau","en":"Curtain-bang layers"}', '{"fr":"Longueurs dégradées, frange rideau","en":"Long layers with curtain bangs"}',             'long flowing layers with soft curtain bangs framing the face',      'long',   0.75, array['bangs','layered'],        array['feminine'],                          80),
  ('mermaid-waves',      '{"fr":"Ondulations sirène","en":"Mermaid waves"}',          '{"fr":"Très longues longueurs, ondulations","en":"Very long, flowing waves"}',                  'very long mermaid waves, glossy and cascading',                     'long',   0.90, array['wavy'],                   array['feminine'],                          58),
  ('sleek-straight-long','{"fr":"Long lisse","en":"Sleek straight long"}',            '{"fr":"Très long, lisse et brillant","en":"Long, sleek and glossy"}',                           'long sleek poker-straight hair with a glossy finish, centre part',  'long',   0.85, array['sleek'],                  array['feminine','androgynous'],            55),
  ('butterfly-cut',      '{"fr":"Coupe papillon","en":"Butterfly cut"}',              '{"fr":"Dégradé volumineux encadrant le visage","en":"Voluminous face-framing layers"}',        'a butterfly cut with voluminous face-framing layers',               'long',   0.70, array['layered'],                array['feminine'],                          76),
  ('money-piece-long',   '{"fr":"Mèches money-piece","en":"Money-piece long"}',       '{"fr":"Longueurs avec mèches claires devant","en":"Long hair with bright face-framing pieces"}','long hair with a lighter money-piece framing the face',             'long',   0.78, array['money-piece'],            array['feminine'],                          63),
  ('nineties-blowout',   '{"fr":"Brushing années 90","en":"''90s blowout"}',          '{"fr":"Brushing volumineux, mèches rebondies","en":"Bouncy voluminous blowout"}',              'a bouncy 90s supermodel blowout with flicked-back layers',          'long',   0.72, array['volume'],                 array['feminine'],                          69),
  ('textured-crop',      '{"fr":"Coupe courte texturée","en":"Textured crop"}',       '{"fr":"Coupe courte, sommet texturé","en":"Short cut, textured top"}',                          'a short textured crop with a natural matte finish',                 'short',  0.20, array['textured'],               array['masculine','androgynous'],           72),
  ('french-crop',        '{"fr":"Crop français","en":"French crop"}',                 '{"fr":"Court avec frange droite, côtés nets","en":"Short with a straight fringe, clean sides"}','a french crop with a blunt fringe and faded sides',                 'short',  0.18, array['fade','bangs'],           array['masculine','androgynous'],           81),
  ('fade-textured-top',  '{"fr":"Dégradé sommet texturé","en":"Fade with textured top"}','{"fr":"Dégradé net, longueur texturée dessus","en":"Clean fade, textured length on top"}',    'a skin fade with a textured longer top, styled forward',            'short',  0.22, array['fade','textured'],        array['masculine'],                         84),
  ('crop-fade',          '{"fr":"Crop dégradé","en":"Crop fade"}',                    '{"fr":"Crop court avec dégradé bas","en":"Short crop with a low fade"}',                        'a short crop with a low fade and tight texture',                    'short',  0.20, array['fade'],                   array['masculine','androgynous'],           73),
  ('mid-taper',          '{"fr":"Dégradé progressif","en":"Mid taper"}',              '{"fr":"Dégradé moyen, longueur souple dessus","en":"Medium taper, loose length on top"}',      'a mid taper fade with loose flowing length on top',                 'short',  0.25, array['fade'],                   array['masculine'],                         79),
  ('slick-back',         '{"fr":"Coiffé en arrière","en":"Slick back"}',              '{"fr":"Cheveux peignés en arrière, côtés courts","en":"Hair combed back, short sides"}',        'a slicked-back style with short faded sides, glossy finish',        'short',  0.30, array['fade','sleek'],           array['masculine'],                         60),
  ('buzz-cut',           '{"fr":"Coupe rasée","en":"Buzz cut"}',                      '{"fr":"Très court, uniforme","en":"Very short, uniform"}',                                      'a clean even buzz cut, uniform short length',                       'short',  0.08, array['short'],                  array['masculine','androgynous'],           52),
  ('modern-mullet',      '{"fr":"Mulet moderne","en":"Modern mullet"}',               '{"fr":"Court devant, long derrière, texturé","en":"Short front, long back, textured"}',        'a modern textured mullet, short on top with a longer nape',         'medium', 0.45, array['textured'],               array['androgynous','masculine'],           71),
  ('textured-pixie',     '{"fr":"Pixie texturé","en":"Textured pixie"}',              '{"fr":"Pixie court et texturé","en":"Short textured pixie"}',                                   'a short textured pixie with piecey layers',                         'pixie',  0.15, array['textured'],               array['feminine','androgynous'],            66),
  ('long-pixie',         '{"fr":"Pixie long","en":"Long pixie"}',                     '{"fr":"Pixie allongé, mèches sur le front","en":"Grown-out pixie with longer fringe"}',        'a long pixie with a sweeping longer fringe',                        'pixie',  0.28, array['bangs'],                  array['feminine','androgynous'],            62),
  ('bixie-cut',          '{"fr":"Coupe bixie","en":"Bixie cut"}',                     '{"fr":"Entre pixie et carré court, volume","en":"Between a pixie and a bob, full"}',            'a bixie cut blending a pixie and a short bob, full and tousled',     'pixie',  0.30, array['textured'],               array['feminine','androgynous'],            77),
  ('undercut-pixie',     '{"fr":"Pixie undercut","en":"Undercut pixie"}',             '{"fr":"Pixie audacieux, côtés rasés","en":"Bold pixie with shaved sides"}',                     'an edgy pixie with a shaved undercut and a longer top',             'pixie',  0.18, array['undercut'],               array['androgynous'],                       59),
  ('defined-curls',      '{"fr":"Boucles définies","en":"Defined curls"}',            '{"fr":"Boucles définies, volume naturel","en":"Defined curls, natural volume"}',                'defined springy curls with natural volume and shine',               'curly',  0.55, array['curly'],                  array['feminine','androgynous'],            75),
  ('curly-bob',          '{"fr":"Carré bouclé","en":"Curly bob"}',                    '{"fr":"Carré court et bouclé, rebondi","en":"Short bouncy curly bob"}',                         'a short curly bob with bouncy defined ringlets',                    'curly',  0.40, array['curly'],                  array['feminine'],                          70),
  ('afro-shapeup',       '{"fr":"Afro net","en":"Afro shape-up"}',                    '{"fr":"Afro arrondi, contours nets","en":"Rounded afro, clean line-up"}',                       'a rounded afro with a crisp shape-up and clean edges',              'curly',  0.35, array['afro'],                   array['masculine','androgynous','feminine'],68),
  ('curly-shag',         '{"fr":"Shag bouclé","en":"Curly shag"}',                    '{"fr":"Shag sur cheveux bouclés, frange","en":"Shag on curly hair with bangs"}',                'a curly shag with curtain bangs and airy curly layers',             'curly',  0.50, array['curly','bangs','layered'],array['feminine','androgynous'],            74)
on conflict (slug) do nothing;
  