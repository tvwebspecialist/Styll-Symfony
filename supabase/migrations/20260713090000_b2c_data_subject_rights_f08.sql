-- =============================================================
-- F-08: B2C data subject rights workflow
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'client_privacy_request_action'
  ) THEN
    CREATE TYPE public.client_privacy_request_action AS ENUM (
      'access_export',
      'access_review',
      'rectification',
      'erasure',
      'restriction'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'client_privacy_request_status'
  ) THEN
    CREATE TYPE public.client_privacy_request_status AS ENUM (
      'completed',
      'submitted',
      'rejected'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.client_privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action public.client_privacy_request_action NOT NULL,
  status public.client_privacy_request_status NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_privacy_requests_tenant_profile_timeline
  ON public.client_privacy_requests (tenant_id, profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_privacy_requests_tenant_client_timeline
  ON public.client_privacy_requests (tenant_id, client_id, created_at DESC);

ALTER TABLE public.client_privacy_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.client_privacy_requests IS
  'Append-only audit trail for B2C data-subject-rights requests and self-service actions.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_privacy_requests'
      AND policyname = 'client_privacy_requests_service_role_all'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY client_privacy_requests_service_role_all
        ON public.client_privacy_requests
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_privacy_requests'
      AND policyname = 'client_privacy_requests_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY client_privacy_requests_select_own
        ON public.client_privacy_requests
        FOR SELECT
        TO authenticated
        USING (auth.uid() = profile_id)
    $policy$;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_privacy_requests'
      AND policyname = 'client_privacy_requests_select_staff_same_tenant'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY client_privacy_requests_select_staff_same_tenant
        ON public.client_privacy_requests
        FOR SELECT
        TO authenticated
        USING (public.has_active_staff_membership(client_privacy_requests.tenant_id))
    $policy$;
  END IF;
END
$$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'new_booking'::text,
    'cancellation'::text,
    'new_client'::text,
    'churn_alert'::text,
    'low_stock'::text,
    'loyalty_milestone'::text,
    'reschedule'::text,
    'booking_confirmed'::text,
    'reminder_3d'::text,
    'reminder_1d'::text,
    'reminder_day'::text,
    'promotion_published'::text,
    'campaign'::text,
    'privacy_request'::text
  ]));
