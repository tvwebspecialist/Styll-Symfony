-- =============================================================
-- 01_base.sql
-- subscription_plans, tenants, locations, tenant_subscriptions
-- =============================================================

-- UUIDs usati in questo file (hardcoded per coerenza FK)
-- plan_starter  : a1000000-0000-0000-0000-000000000001
-- tenant_marco  : b1000000-0000-0000-0000-000000000001
-- location_napo : c1000000-0000-0000-0000-000000000001
-- sub_marco     : d1000000-0000-0000-0000-000000000001

-- 1. subscription_plans
INSERT INTO public.subscription_plans (id, name, slug, price_monthly, max_staff, max_locations, is_active, feature_flags)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Starter',
  'starter',
  29.00,
  3,
  1,
  true,
  '{"booking": true, "crm": true, "loyalty_basic": true, "churn_detector": true, "pwa": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. tenants
INSERT INTO public.tenants (id, business_name, slug, status, timezone, primary_color, secondary_color, font_family, settings)
VALUES (
  'b1000000-0000-0000-0000-000000000001',
  'Marco''s Barber',
  'marco-barber',
  'active',
  'Europe/Rome',
  '#1a1a1a',
  '#c9a96e',
  'Inter',
  '{"booking_advance_days": 30, "cancellation_hours": 24, "currency": "EUR", "locale": "it-IT"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. locations
INSERT INTO public.locations (id, tenant_id, name, address, city, phone, email, is_active)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'Marco''s Barber - Napoli Centro',
  'Via Toledo 45',
  'Napoli',
  '+39 081 1234567',
  'info@marcosbarber.it',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 4. tenant_subscriptions
INSERT INTO public.tenant_subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, trial_ends_at)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'trialing',
  '2026-04-01T00:00:00Z',
  '2026-05-01T00:00:00Z',
  '2026-05-01T00:00:00Z'
)
ON CONFLICT (id) DO NOTHING;
