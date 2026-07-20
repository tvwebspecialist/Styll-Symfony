
-- Function: recalculate_client_analytics
-- Ricalcola client_analytics per tutti i clienti con almeno 1 appuntamento completato.
-- Soglie churn: green se days_since <= avg*1.2, yellow se <= avg*1.8, red altrimenti.
-- Solo clienti con storico vengono toccati (no write su 'unknown' a 0 visite).
-- Returns: jsonb summary { total, green, yellow, red, unknown }.

CREATE OR REPLACE FUNCTION public.recalculate_client_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH completed_appts AS (
    SELECT
      a.client_id,
      a.tenant_id,
      a.start_time,
      LAG(a.start_time) OVER (
        PARTITION BY a.client_id ORDER BY a.start_time
      ) AS prev_start
    FROM appointments a
    WHERE a.status = 'completed'
      AND a.deleted_at IS NULL
  ),
  client_stats AS (
    SELECT
      client_id,
      tenant_id,
      COUNT(*)::int AS total_visits,
      MAX(start_time) AS last_visit_ts,
      AVG(
        CASE WHEN prev_start IS NOT NULL
          THEN EXTRACT(EPOCH FROM (start_time - prev_start)) / 86400.0
        END
      )::numeric AS avg_freq_days
    FROM completed_appts
    GROUP BY client_id, tenant_id
  ),
  computed AS (
    SELECT
      cs.client_id,
      cs.tenant_id,
      cs.total_visits,
      cs.avg_freq_days,
      cs.last_visit_ts,
      GREATEST(0, (now()::date - cs.last_visit_ts::date))::int AS days_since,
      CASE
        WHEN cs.total_visits = 0 OR cs.avg_freq_days IS NULL THEN 'unknown'
        WHEN (now()::date - cs.last_visit_ts::date)::numeric <= cs.avg_freq_days * 1.2 THEN 'green'
        WHEN (now()::date - cs.last_visit_ts::date)::numeric <= cs.avg_freq_days * 1.8 THEN 'yellow'
        ELSE 'red'
      END AS new_status
    FROM client_stats cs
  ),
  upserted AS (
    INSERT INTO client_analytics (
      client_id, tenant_id, total_visits, avg_frequency_days,
      last_visit_date, days_since_last_visit, churn_status,
      computed_at, updated_at
    )
    SELECT
      c.client_id, c.tenant_id, c.total_visits, c.avg_freq_days,
      c.last_visit_ts, c.days_since, c.new_status, now(), now()
    FROM computed c
    ON CONFLICT (client_id) DO UPDATE SET
      tenant_id             = EXCLUDED.tenant_id,
      total_visits          = EXCLUDED.total_visits,
      avg_frequency_days    = EXCLUDED.avg_frequency_days,
      last_visit_date       = EXCLUDED.last_visit_date,
      days_since_last_visit = EXCLUDED.days_since_last_visit,
      churn_status          = EXCLUDED.churn_status,
      computed_at           = EXCLUDED.computed_at,
      updated_at            = EXCLUDED.updated_at
    RETURNING churn_status
  )
  SELECT jsonb_build_object(
    'total',   COUNT(*),
    'green',   COUNT(*) FILTER (WHERE churn_status = 'green'),
    'yellow',  COUNT(*) FILTER (WHERE churn_status = 'yellow'),
    'red',     COUNT(*) FILTER (WHERE churn_status = 'red'),
    'unknown', COUNT(*) FILTER (WHERE churn_status = 'unknown')
  )
  INTO result
  FROM upserted;

  RETURN COALESCE(result, jsonb_build_object(
    'total', 0, 'green', 0, 'yellow', 0, 'red', 0, 'unknown', 0
  ));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_client_analytics() FROM public;
REVOKE EXECUTE ON FUNCTION public.recalculate_client_analytics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_client_analytics() TO service_role;
;
