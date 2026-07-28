-- Ne pas re-créditer un compte supprimé qui se réinscrit.
--
-- La suppression de compte efface tout en cascade (auth.users -> profiles -> crédits, générations,
-- looks...), et le même email peut se réinscrire. Chaque cycle rendait donc une génération Gemini
-- payante gratuite. On garde une empreinte de l'email supprimé, uniquement pour refuser le crédit
-- de bienvenue au retour.
--
-- CE QUI EST CONSERVÉ : un hash, jamais l'email. Douze mois, purgeables (voir purge_signup_marks).
-- Finalité : prévention de l'abus. À annoncer dans la politique de confidentialité — un hash
-- d'email reste une donnée personnelle pseudonymisée au sens du RGPD, pas une donnée anonyme.
--
-- CE QUE ÇA N'ARRÊTE PAS : quelqu'un qui utilise une autre adresse. Le vrai plancher reste le
-- plafond de budget quotidien de la fonction generate. C'est une gêne pour l'abus opportuniste,
-- pas une barrière.

-- ── Schéma privé ──────────────────────────────────────────────────────────────
-- `private` n'est PAS exposé par l'API Data (supabase/config.toml ne publie que public et
-- graphql_public), donc rien ici n'est atteignable par un client, indépendamment des grants.
-- Les revoke sont une seconde barrière, pas la première.
create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

-- ── Le poivre ─────────────────────────────────────────────────────────────────
-- Sans poivre, un hash d'email est trivial à casser : l'espace des adresses est énumérable, un
-- dictionnaire suffit. Le poivre est généré une seule fois, ici, et ne quitte jamais Postgres
-- puisque l'écriture et la lecture du marqueur se font toutes deux en SQL.
create table if not exists private.app_secrets (
  name  text  primary key,
  value bytea not null
);
insert into private.app_secrets (name, value)
values ('signup_mark_pepper', extensions.gen_random_bytes(32))
on conflict (name) do nothing;

-- ── Les marqueurs ─────────────────────────────────────────────────────────────
create table if not exists private.signup_marks (
  email_hash    bytea       primary key,
  -- Le crédit n'est refusé QUE si la personne avait consommé quelque chose. Une suppression
  -- accidentelle, avant tout essai, ne doit pas coûter son crédit de bienvenue au retour.
  had_consumed  boolean     not null default false,
  deleted_at    timestamptz not null default now(),
  returns       integer     not null default 0,
  last_return_at timestamptz
);
comment on table private.signup_marks is
  'Empreintes d''emails de comptes supprimés, pour refuser un second crédit de bienvenue. Hash seul, conservation 12 mois, finalité anti-abus.';

-- ── Normalisation + hachage ───────────────────────────────────────────────────
-- Minuscules, espaces retirés, et +suffixe supprimé : c'est l'astuce la plus courante
-- (moi+1@gmail.com, moi+2@gmail.com) et le +suffixe est ignoré par la quasi-totalité des
-- fournisseurs. Les POINTS sont volontairement conservés : seul Gmail les traite comme non
-- significatifs, donc les ignorer refuserait un crédit à de vrais nouveaux utilisateurs ailleurs.
create or replace function private.email_mark(p_email text)
returns bytea language plpgsql stable security definer set search_path = '' as $$
declare
  v_norm   text;
  v_pepper bytea;
begin
  if p_email is null or btrim(p_email) = '' then return null; end if;
  v_norm := lower(btrim(p_email));
  v_norm := regexp_replace(v_norm, '\+[^@]*(@.*)$', '\1');
  select value into v_pepper from private.app_secrets where name = 'signup_mark_pepper';
  if v_pepper is null then return null; end if;
  return extensions.digest(v_pepper || v_norm::bytea, 'sha256');
end;
$$;

-- ── À la suppression ──────────────────────────────────────────────────────────
-- Trigger sur auth.users plutôt que dans la fonction edge delete-account : une suppression faite
-- depuis le dashboard Supabase ou via l'API admin contournerait la fonction. Ici, tous les chemins
-- sont couverts, et delete-account n'a pas besoin d'être modifiée.
-- BEFORE DELETE : les crédits existent encore, on peut donc savoir si la personne a consommé.
create or replace function private.mark_deleted_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_hash bytea := private.email_mark(old.email);
  v_used boolean;
begin
  if v_hash is null then return old; end if;
  select coalesce(sum(t.delta) filter (where t.delta < 0), 0) < 0
    into v_used from public.credit_transactions t where t.user_id = old.id;
  insert into private.signup_marks (email_hash, had_consumed, deleted_at)
  values (v_hash, coalesce(v_used, false), now())
  on conflict (email_hash) do update
    set had_consumed = private.signup_marks.had_consumed or excluded.had_consumed,
        deleted_at   = excluded.deleted_at;
  return old;
exception when others then
  -- Ne JAMAIS empêcher une suppression de compte : c'est une obligation App Store et un droit RGPD.
  -- Si le marquage échoue, on perd le marqueur, pas la suppression.
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function private.mark_deleted_signup();

-- ── À l'inscription ───────────────────────────────────────────────────────────
-- Reprise à l'identique de 0001, avec la seule différence du crédit conditionnel.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role   user_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'b2c');
  v_hash   bytea;
  v_marked boolean := false;
begin
  insert into profiles (id, role, display_name, lang)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'lang', 'fr')
  );

  -- Ce compte a-t-il déjà eu son crédit de bienvenue sous cette adresse, puis été supprimé ?
  -- Enfermé dans un begin/exception : une inscription ne doit jamais échouer à cause de ça.
  begin
    v_hash := private.email_mark(new.email);
    if v_hash is not null then
      update private.signup_marks
         set returns = returns + 1, last_return_at = now()
       where email_hash = v_hash and had_consumed
      returning true into v_marked;
    end if;
  exception when others then
    v_marked := false;
  end;

  if v_role = 'b2c' and not coalesce(v_marked, false) then
    insert into credit_transactions (user_id, delta, reason) values (new.id, 1, 'free_trial');
  end if;
  return new;
end;
$$;

-- ── Purge (conservation 12 mois) ──────────────────────────────────────────────
-- pg_cron n'est pas installé : à appeler depuis une tâche planifiée, ou à la main.
-- Renvoie le nombre de marqueurs supprimés.
create or replace function private.purge_signup_marks(p_months int default 12)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from private.signup_marks
   where deleted_at < now() - make_interval(months => p_months);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.email_mark(text)          from public, anon, authenticated;
revoke all on function private.purge_signup_marks(int)    from public, anon, authenticated;
grant execute on function private.purge_signup_marks(int) to service_role;
