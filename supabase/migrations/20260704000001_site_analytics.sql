-- =============================================================
-- 20260704000001_site_analytics.sql
-- Site Analytics (Parte B) + Platform Leads (Parte A)
-- Tabelle: platform_leads, site_sessions, site_events, site_analytics_daily
-- Funzioni: reconcile_site_analytics_daily, cleanup_old_site_events
-- pg_cron: riconciliazione giornaliera + cleanup settimanale
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE
-- =============================================================

-- ─── 1. platform_leads (GLOBALE — B2B lead capture su styll.app) ──────────────
CREATE TABLE IF NOT EXISTS public.platform_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL,
  phone               TEXT,
  business_name       TEXT,
  source              TEXT NOT NULL DEFAULT 'trial_signup'
    CHECK (source IN ('trial_signup', 'demo_request', 'content_download', 'chat')),
  posthog_distinct_id TEXT,
  consent_marketing   BOOLEAN NOT NULL DEFAULT false,
  consent_at          TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  converted_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_platform_leads_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_platform_leads_status     ON public.platform_leads(status);
CREATE INDEX IF NOT EXISTS idx_platform_leads_created    ON public.platform_leads(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_platform_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_platform_leads_updated_at ON public.platform_leads;
CREATE TRIGGER trg_platform_leads_updated_at
  BEFORE UPDATE ON public.platform_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_platform_leads_updated_at();

-- ─── 2. site_sessions (sessioni anonime per tenant) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.site_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  anonymous_id  TEXT NOT NULL,
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT,
  CONSTRAINT uq_site_sessions_tenant_anon UNIQUE (tenant_id, anonymous_id)
);

CREATE INDEX IF NOT EXISTS idx_site_sessions_tenant_id  ON public.site_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_sessions_client_id  ON public.site_sessions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_sessions_last_seen  ON public.site_sessions(tenant_id, last_seen_at DESC);

-- ��── 3. site_events (eventi raw per tenant) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id   UUID NOT NULL REFERENCES public.site_sessions(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL,
  event_type   TEXT NOT NULL
    CHECK (event_type IN (
      'page_view', 'service_view', 'booking_started',
      'booking_completed', 'signup_completed', 'login'
    )),
  page_url     TEXT,
  referrer     TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_events_tenant_id    ON public.site_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_events_session_id   ON public.site_events(session_id);
CREATE INDEX IF NOT EXISTS idx_site_events_occurred_at  ON public.site_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_type         ON public.site_events(tenant_id, event_type);

-- ─── 4. site_analytics_daily (rollup giornaliero) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_analytics_daily (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day               DATE NOT NULL,
  sessions          INTEGER NOT NULL DEFAULT 0,
  page_views        INTEGER NOT NULL DEFAULT 0,
  unique_visitors   INTEGER NOT NULL DEFAULT 0,
  booking_started   INTEGER NOT NULL DEFAULT 0,
  booking_completed INTEGER NOT NULL DEFAULT 0,
  conversion_rate   NUMERIC(5,4) NOT NULL DEFAULT 0,
  new_signups       INTEGER NOT NULL DEFAULT 0,
  logins            INTEGER NOT NULL DEFAULT 0,
  mobile_sessions   INTEGER NOT NULL DEFAULT 0,
  desktop_sessions  INTEGER NOT NULL DEFAULT 0,
  top_referrer      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_site_analytics_daily_tenant_day UNIQUE (tenant_id, day)
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_daily_tenant ON public.site_analytics_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_daily_day    ON public.site_analytics_daily(tenant_id, day DESC);

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────

-- platform_leads: sola lettura/scrittura superadmin; insert via service role dal server
ALTER TABLE public.platform_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin all platform_leads" ON public.platform_leads;
CREATE POLICY "superadmin all platform_leads"
  ON public.platform_leads FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- site_sessions: nessun accesso diretto client; scrittura solo via service role (route API)
ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manager reads site_sessions" ON public.site_sessions;
CREATE POLICY "owner manager reads site_sessions"
  ON public.site_sessions FOR SELECT
  USING (
    tenant_id = ANY(get_my_tenant_ids())
    AND EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE profile_id = auth.uid()
        AND tenant_id = site_sessions.tenant_id
        AND role IN ('owner', 'manager')
        AND is_active = true
        AND deleted_at IS NULL
    )
  );

-- site_events: scrittura solo via service role
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manager reads site_events" ON public.site_events;
CREATE POLICY "owner manager reads site_events"
  ON public.site_events FOR SELECT
  USING (
    tenant_id = ANY(get_my_tenant_ids())
    AND EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE profile_id = auth.uid()
        AND tenant_id = site_events.tenant_id
        AND role IN ('owner', 'manager')
        AND is_active = true
        AND deleted_at IS NULL
    )
  );

-- site_analytics_daily: owner/manager legge il suo tenant
ALTER TABLE public.site_analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner manager reads site_analytics_daily" ON public.site_analytics_daily;
CREATE POLICY "owner manager reads site_analytics_daily"
  ON public.site_analytics_daily FOR SELECT
  USING (
    tenant_id = ANY(get_my_tenant_ids())
    AND EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE profile_id = auth.uid()
        AND tenant_id = site_analytics_daily.tenant_id
        AND role IN ('owner', 'manager')
        AND is_active = true
        AND deleted_at IS NULL
    )
  );

-- ─── 6. reconcile_site_analytics_daily ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reconcile_site_analytics_daily(
  p_day DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.site_analytics_daily (
    tenant_id, day,
    sessions, page_views, unique_visitors,
    booking_started, booking_completed, conversion_rate,
    new_signups, logins,
    mobile_sessions, desktop_sessions,
    top_referrer, updated_at
  )
  SELECT
    e.tenant_id,
    p_day,
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
      WHERE e2.tenant_id = e.tenant_id
        AND e2.occurred_at::DATE = p_day
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
  GROUP BY e.tenant_id
  ON CONFLICT (tenant_id, day)
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

-- ─── 7. cleanup_old_site_events ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_old_site_events(
  p_retain_days INTEGER DEFAULT 90
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.site_events
  WHERE occurred_at < now() - (p_retain_days || ' days')::INTERVAL;
END;
$$;

-- ─── 8. pg_cron (idempotente, silente se pg_cron non disponibile) ─────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM cron.unschedule('reconcile_site_analytics_daily');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'reconcile_site_analytics_daily',
    '0 2 * * *',
    $$SELECT public.reconcile_site_analytics_daily(CURRENT_DATE - 1)$$
  );

  BEGIN
    PERFORM cron.unschedule('cleanup_old_site_events');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'cleanup_old_site_events',
    '0 3 * * 0',
    $$SELECT public.cleanup_old_site_events(90)$$
  );
END;
$$;
