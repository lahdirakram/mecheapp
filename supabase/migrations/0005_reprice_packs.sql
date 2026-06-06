-- Reprice the credit packs to a cheaper, more generous ladder (impulse 0,99 € entry, more
-- looks per euro). `price`/`unit` are display strings; real charges come from store IAP later.
insert into credit_packs (id, credits, price, unit, badge) values
  ('taste',  5, '0,99 €', '0,20 €', null),
  ('star',  20, '2,99 €', '0,15 €', 'popular'),
  ('pro',   50, '5,99 €', '0,12 €', 'best')
on conflict (id) do update
  set credits = excluded.credits,
      price   = excluded.price,
      unit    = excluded.unit,
      badge   = excluded.badge;
