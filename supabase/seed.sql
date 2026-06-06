-- Seed reference / demo data (mirrors @meche/core mock data). Runs on `supabase db reset`.

-- Credit packs (B2C recharge) — no subscription.
insert into credit_packs (id, credits, price, unit, badge) values
  ('taste',  5, '0,99 €', '0,20 €', null),
  ('star',  20, '2,99 €', '0,15 €', 'popular'),
  ('pro',   50, '5,99 €', '0,12 €', 'best')
on conflict (id) do nothing;

-- Demo salons + stylists (B2C "Coiffeurs" finder targets the stylist, not the salon).
insert into salons (id, name, area) values
  ('11111111-1111-1111-1111-111111111111', 'Atelier Bonaparte', 'Saint-Germain · Paris 6'),
  ('22222222-2222-2222-2222-222222222222', 'Studio Marais',     'Marais · Paris 4'),
  ('33333333-3333-3333-3333-333333333333', 'République Coiff',  'République · Paris 11'),
  ('44444444-4444-4444-4444-444444444444', 'La Maison Olive',   'Batignolles · Paris 17')
on conflict (id) do nothing;

insert into stylists (id, salon_id, name, area, rating, reviews, price, open) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Atelier Bonaparte', 'Saint-Germain · Paris 6', 4.8, 312, '€€€',  true),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Studio Marais',     'Marais · Paris 4',        4.7, 198, '€€',   true),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'République Coiff',  'République · Paris 11',   4.5, 84,  '€€',   false),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'La Maison Olive',   'Batignolles · Paris 17',  4.9, 421, '€€€€', true)
on conflict (id) do nothing;

-- Multi-source inspiration feed (studio editorial / real salon / community).
insert into feed_items (kind, name, tag, hair, mood, loves, descr, label, by, match, image_url) values
  ('studio',
    '{"fr":"Carré flou caramel","en":"Caramel soft bob"}', '{"fr":"TENDANCE","en":"TRENDING"}',
    'bob', 'warm', '12.4k',
    '{"fr":"Carré doux aux épaules, reflets caramel","en":"Soft shoulder bob, caramel tones"}',
    '{"fr":"STUDIO MÈCHE","en":"MÈCHE STUDIO"}', '{"fr":"Édition Été 26","en":"Summer 26 edit"}', null,
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=1100&fit=crop'),
  ('studio',
    '{"fr":"Boucles volume","en":"Volume curls"}', '{"fr":"POUR TOI","en":"FOR YOU"}',
    'curly', 'night', '19.3k',
    '{"fr":"Boucles naturelles, gros volume","en":"Natural curls, big volume"}',
    '{"fr":"STUDIO MÈCHE","en":"MÈCHE STUDIO"}', '{"fr":"Référence éditoriale","en":"Editorial reference"}', null,
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=1100&fit=crop'),
  ('salon',
    '{"fr":"Lob blond ondulé","en":"Wavy blond lob"}', '{"fr":"NOUVEAU","en":"NEW"}',
    'long', 'sand', '8.1k',
    '{"fr":"Mi-long ondulé, reflets blond","en":"Wavy mid-length, blond"}',
    '{"fr":"CHEZ ATELIER BONAPARTE","en":"AT ATELIER BONAPARTE"}', '{"fr":"Saint-Germain · Paris 6","en":"Saint-Germain · Paris 6"}', 96,
    'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=800&h=1100&fit=crop'),
  ('user',
    '{"fr":"Pixie texturé","en":"Textured pixie"}', '{"fr":"OSÉ","en":"BOLD"}',
    'pixie', 'cool', '4.7k',
    '{"fr":"Très court, ultra texturé","en":"Very short, textured"}',
    '{"fr":"@léa.dpt","en":"@lea.dpt"}', '{"fr":"A essayé · gardé en mèche","en":"Tried · kept"}', null,
    'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=800&h=1100&fit=crop'),
  ('salon',
    '{"fr":"Coupe courte texturée","en":"Textured crop"}', '{"fr":"CLASSIQUE","en":"CLASSIC"}',
    'short', 'cool', '6.0k',
    '{"fr":"Dégradé net, texture au sommet","en":"Clean fade, textured top"}',
    '{"fr":"CHEZ STUDIO MARAIS","en":"AT STUDIO MARAIS"}', '{"fr":"Marais · Paris 4","en":"Marais · Paris 4"}', 92,
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&h=1100&fit=crop');

-- Demo portfolio for the first stylist (Pro "Mes réalisations").
insert into portfolio_items (stylist_id, name, hair, mood, loves, bookings_generated) values
  ('a1111111-1111-1111-1111-111111111111', 'Carré flou caramel', 'bob',   'warm',  142, 12),
  ('a1111111-1111-1111-1111-111111111111', 'Wolf cut châtain',   'long',  'cool',  88,  7),
  ('a1111111-1111-1111-1111-111111111111', 'Pixie noir',         'pixie', 'night', 203, 19);
