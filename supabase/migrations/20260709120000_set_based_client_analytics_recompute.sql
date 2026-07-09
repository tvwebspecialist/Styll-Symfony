-- =============================================================
-- 20260709120000_set_based_client_analytics_recompute.sql
-- SS-03: replace client-by-client analytics recompute with
-- set-based bulk upserts that scale on large datasets.
-- =============================================================

CREATE INDEX IF NOT EXISTS appointments_analytics_tenant_client_status_deleted_start_idx
  ON public.appointments (tenant_id, client_id, status, deleted_at, start_time);

CREATE INDEX IF NOT EXISTS appointments_analytics_completed_tenant_client_start_idx
  ON public.appointments (tenant_id, client_id, start_time)
  WHERE deleted_at IS NULL AND status = 'completed';

CREATE OR REPLACE FUNCTION public.recompute_client_analytics_scope(
  p_scope_tenant_id UUID DEFAULT NULL,
  p_scope_client_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INTEGER := 0;
BEGIN
  SELECT COUNT(*)::int
    INTO v_processed
  FROM public.clients AS c
  WHERE c.deleted_at IS NULL
    AND (p_scope_tenant_id IS NULL OR c.tenant_id = p_scope_tenant_id)
    AND (p_scope_client_id IS NULL OR c.id = p_scope_client_id);

  WITH target_clients AS (
    SELECT
      c.id AS client_id,
      c.tenant_id,
      c.churn_profiling_objected_at
    FROM public.clients AS c
    WHERE c.deleted_at IS NULL
      AND (p_scope_tenant_id IS NULL OR c.tenant_id = p_scope_tenant_id)
      AND (p_scope_client_id IS NULL OR c.id = p_scope_client_id)
  ),
  completed_appts AS (
    SELECT
      tc.client_id,
      tc.tenant_id,
      a.start_time,
      LAG(a.start_time) OVER (
        PARTITION BY tc.tenant_id, tc.client_id
        ORDER BY a.start_time, a.id
      ) AS prev_start
    FROM target_clients AS tc
    JOIN public.appointments AS a
      ON a.tenant_id = tc.tenant_id
     AND a.client_id = tc.client_id
     AND a.status = 'completed'
     AND a.deleted_at IS NULL
  ),
  aggregated AS (
    SELECT
      tc.client_id,
      tc.tenant_id,
      tc.churn_profiling_objected_at,
      COUNT(ca.start_time)::int AS total_visits,
      MAX(ca.start_time) AS last_visit_date,
      AVG(
        CASE
          WHEN ca.prev_start IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ca.start_time - ca.prev_start)) / 86400.0
          ELSE NULL
        END
      )::numeric(6,2) AS avg_frequency_days
    FROM target_clients AS tc
    LEFT JOIN completed_appts AS ca
      ON ca.tenant_id = tc.tenant_id
     AND ca.client_id = tc.client_id
    GROUP BY tc.client_id, tc.tenant_id, tc.churn_profiling_objected_at
  ),
  computed AS (
    SELECT
      a.client_id,
      a.tenant_id,
      a.total_visits,
      a.avg_frequency_days,
      a.last_visit_date,
      CASE
        WHEN a.last_visit_date IS NULL THEN NULL
        ELSE GREATEST(0, CURRENT_DATE - a.last_visit_date::date)
      END::int AS days_since_last_visit,
      a.churn_profiling_objected_at
    FROM aggregated AS a
  ),
  prepared AS (
    SELECT
      c.client_id,
      c.tenant_id,
      c.total_visits,
      c.avg_frequency_days,
      c.last_visit_date,
      c.days_since_last_visit,
      CASE
        WHEN c.avg_frequency_days IS NULL OR c.days_since_last_visit IS NULL THEN 'unknown'
        WHEN c.days_since_last_visit <= c.avg_frequency_days THEN 'green'
        WHEN c.days_since_last_visit <= c.avg_frequency_days * 1.5 THEN 'yellow'
        ELSE 'red'
      END AS churn_status,
      c.churn_profiling_objected_at
    FROM computed AS c
  )
  INSERT INTO public.client_analytics (
    client_id,
    tenant_id,
    total_visits,
    avg_frequency_days,
    last_visit_date,
    days_since_last_visit,
    churn_status,
    computed_at,
    updated_at
  )
  SELECT
    p.client_id,
    p.tenant_id,
    p.total_visits,
    p.avg_frequency_days,
    p.last_visit_date,
    p.days_since_last_visit,
    p.churn_status,
    now(),
    now()
  FROM prepared AS p
  -- Preserve the existing GDPR semantics: objected clients are counted
  -- in the processed scope but their analytics row is not recomputed.
  WHERE p.churn_profiling_objected_at IS NULL
  ON CONFLICT (client_id) DO UPDATE SET
    tenant_id             = EXCLUDED.tenant_id,
    total_visits          = EXCLUDED.total_visits,
    avg_frequency_days    = EXCLUDED.avg_frequency_days,
    last_visit_date       = EXCLUDED.last_visit_date,
    days_since_last_visit = EXCLUDED.days_since_last_visit,
    churn_status          = EXCLUDED.churn_status,
    computed_at           = now(),
    updated_at            = now();

  RETURN COALESCE(v_processed, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_client_analytics(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.clients
    WHERE id = p_client_id
      AND deleted_at IS NULL
  )
    INTO v_client_exists;

  IF NOT v_client_exists THEN
    DELETE FROM public.client_analytics
    WHERE client_id = p_client_id;
    RETURN;
  END IF;

  PERFORM public.recompute_client_analytics_scope(
    p_scope_client_id => p_client_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_tenant_client_analytics(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.recompute_client_analytics_scope(
    p_scope_tenant_id => p_tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.recompute_all_client_analytics()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.recompute_client_analytics_scope();
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_client_analytics_scope(UUID, UUID)
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.recompute_client_analytics(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_client_analytics(UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.recompute_tenant_client_analytics(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_tenant_client_analytics(UUID)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.recompute_all_client_analytics()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_all_client_analytics()
  TO service_role;
