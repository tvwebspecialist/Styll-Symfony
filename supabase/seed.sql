-- =============================================================
-- seed.sql  — orchestrator
-- Runs all seed files in dependency order.
-- Usage: psql $DATABASE_URL -f supabase/seed.sql
-- =============================================================

\i supabase/seeds/01_base.sql
\i supabase/seeds/02_staff.sql
\i supabase/seeds/03_catalogo.sql
\i supabase/seeds/04_clienti.sql
\i supabase/seeds/05_appuntamenti.sql
\i supabase/seeds/06_loyalty.sql
