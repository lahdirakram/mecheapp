-- Pro: attach an (optional) client first name to each try-on, so the Studio history can be
-- filtered "par cliente". Nullable and unused by the B2C app.
alter table looks add column if not exists client_name text;
