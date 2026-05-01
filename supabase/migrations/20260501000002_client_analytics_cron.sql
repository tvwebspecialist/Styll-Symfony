-- =============================================================
-- 20260501000002_client_analytics_cron.sql
-- Cron notturno per ricalcolare days_since_last_visit
-- Richiede l'estensione pg_cron abilitata su Supabase
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'recompute_client_analytics_nightly',
  '15 3 * * *',
  $$ SELECT public.recompute_all_client_analytics(); $$
);
