-- Women-only B2C feed: deactivate the cuts that read distinctly masculine even on a woman, so the
-- generator (which only samples active styles) skips them. Kept in the catalog, fully reversible.
-- Split out from 0014 because 0014 was already applied to staging, and applied migrations must not
-- be edited (the change would never re-run). This applies cleanly to both staging and prod.
update haircut_catalog set active = false where slug in ('fade-textured-top', 'slick-back', 'mid-taper');
