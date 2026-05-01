-- =============================================================
-- 20260501000001_client_analytics.sql
-- Tabella client_analytics + algoritmo semaforo churn
-- Idempotente: usa IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS
-- =============================================================

-- ─── 1. Tabella ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_analytics (
  client_id              UUID PRIMARY KEY
                         REFERENCES public.clients(id) ON DELETE CASCADE,
  tenant_id              UUID NOT NULL
                         REFERENCES public.tenants(id) ON DELETE CASCADE,
  total_visits           INTEGER NOT NULL DEFAULT 0,
  avg_frequency_days     NUMERIC(6,2),
  last_visit_date        TIMESTAMPTZ,
  days_since_last_visit  INTEGER,
  churn_status           TEXT NOT NULL DEFAULT 'unknown'
                         CHECK (churn_status IN ('unknown','green','yellow','red')),
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_analytics_tenant_status
  ON public.client_analytics (tenant_id, churn_status);
CREATE INDEX IF NOT EXISTS idx_client_analytics_tenant_days
  ON public.client_analytics (tenant_id, days_since_last_visit DESC);

-- ─── 2. Helper tenant (non esiste ancora nel DB) ─────────────
-- Restituisce il tenant_id del membro staff attualmente loggato.
-- Usata nelle RLS policy per isolamento multi-tenant.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.staff_members
  WHERE profile_id = auth.uid()
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- ─── 3. RLS ──────────────────────────────────────────────────
ALTER TABLE public.client_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_tenant_select ON public.client_analytics;
CREATE POLICY analytics_tenant_select ON public.client_analytics
  FOR SELECT USING (tenant_id = public.current_tenant_id());

-- ─── 4. Ricalcolo di UN cliente ──────────────────────────────
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
BEGIN
  -- Recupera il tenant; se il cliente è soft-deleted rimuovi la riga
  SELECT tenant_id INTO v_tenant_id
  FROM public.clients
  WHERE id = p_client_id AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    DELETE FROM public.client_analytics WHERE client_id = p_client_id;
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

-- ─── 5. Trigger su appointments ──────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_appt_recompute_analytics()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_client_analytics(OLD.client_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_client_analytics(NEW.client_id);
  -- Se il client_id è cambiato in un UPDATE, ricalcola anche il vecchio
  IF TG_OP = 'UPDATE' AND OLD.client_id IS DISTINCT FROM NEW.client_id THEN
    PERFORM public.recompute_client_analytics(OLD.client_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS appt_recompute_analytics ON public.appointments;
CREATE TRIGGER appt_recompute_analytics
AFTER INSERT OR UPDATE OF status, start_time, client_id, deleted_at OR DELETE
ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.tg_appt_recompute_analytics();

-- ─── 6. Bulk recompute (cron + backfill) ─────────────────────
CREATE OR REPLACE FUNCTION public.recompute_all_client_analytics()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.clients WHERE deleted_at IS NULL LOOP
    PERFORM public.recompute_client_analytics(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- ─── 7. Backfill iniziale ─────────────────────────────────────
SELECT public.recompute_all_client_analytics();
