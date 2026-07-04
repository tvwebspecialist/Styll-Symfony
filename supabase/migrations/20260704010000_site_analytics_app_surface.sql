-- =============================================================
-- 20260704010000_site_analytics_app_surface.sql
-- Aggiunge app_surface ('website' | 'pwa') a site_sessions e
-- site_analytics_daily, aggiorna i vincoli UNIQUE e la funzione
-- di riconciliazione.
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE
-- Righe preesistenti ricevono il default 'website'.
-- =============================================================

-- ─── 1. site_sessions — aggiungi colonna e aggiorna vincolo ───

ALTER TABLE public.site_sessions
  ADD COLUMN IF NOT EXISTS app_surface TEXT NOT NULL DEFAULT 'website'
    CHECK (app_surface IN ('website', 'pwa'));

-- La vecchia chiave era (tenant_id, anonymous_id): uno stesso browser
-- poteva visitare sia il sito che la PWA e verrebbe bloccato.
-- La nuova chiave aggiunge app_surface così le due sessioni coesistono.
ALTER TABLE public.site_sessions
  DROP CONSTRAINT IF EXISTS uq_site_sessions_tenant_anon;

ALTER TABLE public.site_sessions
  ADD CONSTRAINT IF NOT EXISTS uq_site_sessions_tenant_anon_surface
    UNIQUE (tenant_id, anonymous_id, app_surface);

CREATE INDEX IF NOT EXISTS idx_site_sessions_surface
  ON public.site_sessions(tenant_id, app_surface);

-- ─── 2. site_analytics_daily — aggiungi colonna e aggiorna vincolo ───

ALTER TABLE public.site_analytics_daily
  ADD COLUMN IF NOT EXISTS app_surface TEXT NOT NULL DEFAULT 'website'
    CHECK (app_surface IN ('website', 'pwa'));

-- La vecchia chiave (tenant_id, day) diventa (tenant_id, day, app_surface):
-- un tenant avrà al più 2 righe per giorno (una per sorgente).
ALTER TABLE public.site_analytics_daily
  DROP CONSTRAINT IF EXISTS uq_site_analytics_daily_tenant_day;

ALTER TABLE public.site_analytics_daily
  ADD CONSTRAINT IF NOT EXISTS uq_site_analytics_daily_tenant_day_surface
    UNIQUE (tenant_id, day, app_surface);

CREATE INDEX IF NOT EXISTS idx_site_analytics_daily_surface
  ON public.site_analytics_daily(tenant_id, app_surface, day DESC);

-- ─── 3. Aggiorna reconcile_site_analytics_daily ──────────────

CREATE OR REPLACE FUNCTION public.reconcile_site_analytics_daily(
  p_day DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.site_analytics_daily (
    tenant_id, day, app_surface,
    sessions, page_views, unique_visitors,
    booking_started, booking_completed, conversion_rate,
    new_signups, logins,
    mobile_sessions, desktop_sessions,
    top_referrer, updated_at
  )
  SELECT
    e.tenant_id,
    p_day,
    s.app_surface,
    COUNT(DISTINCT e.session_id),
    COUNT(*) FILTER (WHERE e.event_type = 'page_view'),
    COUNT(DISTINCT e.anonymous_id),
    COUNT(*) FILTER (WHERE e.event_type = 'booking_started'),
    COUNT(*) FILTER (WHERE e.event_type = 'booking_completed'),
    CASE
      WHEN COUNT(*) FILTER (WHERE e.event_type = 'booking_started') > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE e.event_type = 'booking_completed')::NUMERIC
        / NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'booking_started'), 0),
        4
      )
      ELSE 0
    END,
    COUNT(*) FILTER (WHERE e.event_type = 'signup_completed'),
    COUNT(*) FILTER (WHERE e.event_type = 'login'),
    COUNT(DISTINCT s.id) FILTER (
      WHERE s.user_agent ILIKE '%mobile%'
         OR s.user_agent ILIKE '%android%'
         OR s.user_agent ILIKE '%iphone%'
    ),
    COUNT(DISTINCT s.id) FILTER (
      WHERE NOT (
        s.user_agent ILIKE '%mobile%'
        OR s.user_agent ILIKE '%android%'
        OR s.user_agent ILIKE '%iphone%'
      )
    ),
    (
      SELECT e2.referrer
      FROM public.site_events e2
      JOIN public.site_sessions s2 ON s2.id = e2.session_id
      WHERE e2.tenant_id = e.tenant_id
        AND e2.occurred_at::DATE = p_day
        AND s2.app_surface = s.app_surface
        AND e2.referrer IS NOT NULL
        AND e2.referrer <> ''
      GROUP BY e2.referrer
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    now()
  FROM public.site_events e
  JOIN public.site_sessions s ON s.id = e.session_id
  WHERE e.occurred_at::DATE = p_day
  GROUP BY e.tenant_id, s.app_surface
  ON CONFLICT (tenant_id, day, app_surface)
  DO UPDATE SET
    sessions          = EXCLUDED.sessions,
    page_views        = EXCLUDED.page_views,
    unique_visitors   = EXCLUDED.unique_visitors,
    booking_started   = EXCLUDED.booking_started,
    booking_completed = EXCLUDED.booking_completed,
    conversion_rate   = EXCLUDED.conversion_rate,
    new_signups       = EXCLUDED.new_signups,
    logins            = EXCLUDED.logins,
    mobile_sessions   = EXCLUDED.mobile_sessions,
    desktop_sessions  = EXCLUDED.desktop_sessions,
    top_referrer      = EXCLUDED.top_referrer,
    updated_at        = EXCLUDED.updated_at;
END;
$$;
