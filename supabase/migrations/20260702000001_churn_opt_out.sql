-- =============================================================
-- 20260702000001_churn_opt_out.sql
-- Diritto di opposizione al profiling di churn (Art. 21 GDPR)
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE
-- =============================================================

-- ─── 1. Colonna opt-out ──────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS churn_profiling_objected_at TIMESTAMPTZ;

-- ─── 2. Aggiorna recompute_client_analytics ──────────────────
-- Se il cliente ha esercitato il diritto di opposizione al
-- profiling di churn, la funzione esce senza aggiornare
-- client_analytics per quel cliente.
CREATE OR REPLACE FUNCTION public.recompute_client_analytics(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id  UUID;
  v_total      INTEGER;
  v_last_visit TIMESTAMPTZ;
  v_avg_freq   NUMERIC;
  v_days_since INTEGER;
  v_status     TEXT;
  v_objected   TIMESTAMPTZ;
BEGIN
  -- Recupera il tenant; se il cliente è soft-deleted rimuovi la riga
  SELECT tenant_id, churn_profiling_objected_at
    INTO v_tenant_id, v_objected
  FROM public.clients
  WHERE id = p_client_id AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    DELETE FROM public.client_analytics WHERE client_id = p_client_id;
    RETURN;
  END IF;

  -- Rispetta il diritto di opposizione al profiling (Art. 21 GDPR)
  IF v_objected IS NOT NULL THEN
    RETURN;
  END IF;

  -- 1) totale visite completate + ultima visita
  SELECT COUNT(*), MAX(start_time)
    INTO v_total, v_last_visit
  FROM public.appointments
  WHERE client_id = p_client_id
    AND status = 'completed'
    AND deleted_at IS NULL;

  -- 2) frequenza media (richiede >= 2 visite)
  IF v_total >= 2 THEN
    SELECT AVG(diff_days) INTO v_avg_freq
    FROM (
      SELECT EXTRACT(EPOCH FROM (
               start_time - LAG(start_time) OVER (ORDER BY start_time)
             )) / 86400.0 AS diff_days
      FROM public.appointments
      WHERE client_id = p_client_id
        AND status = 'completed'
        AND deleted_at IS NULL
    ) sub
    WHERE diff_days IS NOT NULL;
  END IF;

  -- 3) giorni dall'ultima visita
  IF v_last_visit IS NOT NULL THEN
    v_days_since := GREATEST(0, (CURRENT_DATE - v_last_visit::date));
  END IF;

  -- 4) semaforo
  IF v_avg_freq IS NULL OR v_days_since IS NULL THEN
    v_status := 'unknown';
  ELSIF v_days_since <= v_avg_freq THEN
    v_status := 'green';
  ELSIF v_days_since <= v_avg_freq * 1.5 THEN
    v_status := 'yellow';
  ELSE
    v_status := 'red';
  END IF;

  -- 5) upsert
  INSERT INTO public.client_analytics
    (client_id, tenant_id, total_visits, avg_frequency_days,
     last_visit_date, days_since_last_visit, churn_status, computed_at, updated_at)
  VALUES
    (p_client_id, v_tenant_id, v_total, v_avg_freq,
     v_last_visit, v_days_since, v_status, now(), now())
  ON CONFLICT (client_id) DO UPDATE SET
    tenant_id             = EXCLUDED.tenant_id,
    total_visits          = EXCLUDED.total_visits,
    avg_frequency_days    = EXCLUDED.avg_frequency_days,
    last_visit_date       = EXCLUDED.last_visit_date,
    days_since_last_visit = EXCLUDED.days_since_last_visit,
    churn_status          = EXCLUDED.churn_status,
    computed_at           = now(),
    updated_at            = now();
END; $$;
