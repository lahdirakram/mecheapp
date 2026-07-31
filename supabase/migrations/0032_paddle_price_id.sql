-- Paiement web (Paddle) : relier chaque pack de crédits à son prix Paddle.
--
-- UNE SEULE COLONNE, et c'est délibéré. Le web vend exactement les mêmes packs que les stores, donc
-- il n'y a ni colonne `channel` ni lignes propres au web : les trois lignes existantes servent les
-- deux surfaces. C'est aussi ce qui évite l'ordre « OTA d'abord, migration ensuite » — une colonne
-- nullable est invisible pour un client déjà installé qui fait `select *`.
--
-- `credit_packs` reste en lecture seule côté client (policy `credit_packs_read` de 0001, aucune
-- policy d'écriture). Seul `service_role` écrit ici, comme pour `product_id`.
alter table credit_packs add column if not exists paddle_price_id text;

-- Un prix Paddle ne peut désigner qu'un seul pack : sans ça, un `paddle_price_id` dupliqué par
-- erreur rendrait le montant crédité non déterministe (le webhook prend la première ligne trouvée).
create unique index if not exists credit_packs_paddle_price_id_key
  on credit_packs (paddle_price_id)
  where paddle_price_id is not null;

comment on column credit_packs.paddle_price_id is
  'Identifiant de prix Paddle (pri_...). NULL tant que le pack n''est pas vendu sur le web. '
  'Les environnements sandbox et production de Paddle ont des identifiants DIFFERENTS : '
  'cette colonne contient celui du projet Supabase correspondant (staging <-> sandbox, prod <-> live).';

-- À renseigner à la main, par environnement, une fois les prix créés dans Paddle :
--   update credit_packs set paddle_price_id = 'pri_...' where id = 'taste';
--   update credit_packs set paddle_price_id = 'pri_...' where id = 'star';
--   update credit_packs set paddle_price_id = 'pri_...' where id = 'pro';
-- Volontairement pas dans la migration : les identifiants diffèrent entre sandbox et production, et
-- les coder ici ferait diverger les deux bases au premier `db push`.
