-- Styll — Seed data for local development
-- Run: supabase db reset (applies migrations + seed)

-- Insert subscription plans
INSERT INTO subscription_plans (name, slug, price_monthly, max_staff, max_locations, feature_flags) VALUES
  ('Starter', 'starter', 29.00, 1, 1, '{"booking": true, "crm": true, "loyalty_basic": true, "churn_detector": true, "pwa": true}'),
  ('Growth', 'growth', 59.00, 5, 2, '{"booking": true, "crm": true, "loyalty_basic": true, "churn_detector": true, "pwa": true, "gamification": true, "win_back": true, "qr_walkin": true}'),
  ('Pro', 'pro', 129.00, NULL, NULL, '{"booking": true, "crm": true, "loyalty_basic": true, "churn_detector": true, "pwa": true, "gamification": true, "win_back": true, "qr_walkin": true, "ai_coach": true, "analytics_advanced": true}')
ON CONFLICT (slug) DO NOTHING;
