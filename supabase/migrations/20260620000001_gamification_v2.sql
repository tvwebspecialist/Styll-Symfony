-- =============================================================================
-- Gamification v2: badges, client_badges, tier_configs
-- =============================================================================
-- Adds three new tables for the full gamification system (Club VIP template).
-- All tables use the service-role admin client via server actions — RLS policies
-- are defined for completeness but write ops go through createAdminClient().
-- =============================================================================

-- ─── 1. badges ───────────────────────────────────────────────────────────────
-- Catalog of unlockable achievements per tenant. Tenants activate/deactivate
-- from the loyalty settings page; they cannot create custom badge logic.

CREATE TABLE IF NOT EXISTS public.badges (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  description     TEXT,
  icon_url        TEXT,                             -- /img/badges/*.svg — null → emoji fallback in UI
  condition_type  TEXT         NOT NULL,            -- visits_count | streak_count | points_total | months_since_first_visit | manual
  condition_value INTEGER      NOT NULL DEFAULT 1,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order   INTEGER      NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_tenant ON public.badges(tenant_id);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Staff can read their tenant's badges
CREATE POLICY "badges_select_staff" ON public.badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.tenant_id  = badges.tenant_id
        AND sm.is_active  = TRUE
        AND sm.deleted_at IS NULL
    )
  );

-- Clients can read active badges for their booked tenant
CREATE POLICY "badges_select_client" ON public.badges FOR SELECT
  USING (
    is_active = TRUE AND
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.profile_id = auth.uid()
        AND c.tenant_id  = badges.tenant_id
        AND c.deleted_at IS NULL
    )
  );

-- ─── 2. client_badges ────────────────────────────────────────────────────────
-- Unlocked badges per client. Idempotent: unique constraint prevents doubles.

CREATE TABLE IF NOT EXISTS public.client_badges (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id   UUID         NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  badge_id    UUID         NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, client_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_client_badges_tenant_client ON public.client_badges(tenant_id, client_id);

ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;

-- Staff can read badges for any client in their tenant
CREATE POLICY "client_badges_select_staff" ON public.client_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.tenant_id  = client_badges.tenant_id
        AND sm.is_active  = TRUE
        AND sm.deleted_at IS NULL
    )
  );

-- Clients can read only their own badges
CREATE POLICY "client_badges_select_client" ON public.client_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.profile_id = auth.uid()
        AND c.id         = client_badges.client_id
        AND c.deleted_at IS NULL
    )
  );

-- ─── 3. tier_configs ─────────────────────────────────────────────────────────
-- 4 tiers per tenant (bronze / silver / gold / diamond). Min-points thresholds
-- and benefits are configurable by the barber via the loyalty settings page.

CREATE TABLE IF NOT EXISTS public.tier_configs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tier_name     TEXT         NOT NULL,  -- bronze | silver | gold | diamond
  tier_label    TEXT         NOT NULL,  -- Bronzo | Argento | Oro | Diamante (localizable)
  min_points    INTEGER      NOT NULL DEFAULT 0,
  benefits      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- benefits shape: {
  --   priority_booking: bool,
  --   bonus_points_pct: int,        (e.g. 10 = +10% points per visit)
  --   permanent_discount_pct: int,  (e.g. 5 = 5% off every visit)
  --   upgrade_service: bool,
  --   birthday_reward: bool
  -- }
  visual_style  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- visual_style shape: { border_color: string, gradient: string }
  display_order INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_tier_configs_tenant ON public.tier_configs(tenant_id, display_order);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_tier_configs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tier_configs_set_updated_at ON public.tier_configs;
CREATE TRIGGER tier_configs_set_updated_at
  BEFORE UPDATE ON public.tier_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_tier_configs_updated_at();

ALTER TABLE public.tier_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_configs_select_staff" ON public.tier_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.tenant_id  = tier_configs.tenant_id
        AND sm.is_active  = TRUE
        AND sm.deleted_at IS NULL
    )
  );

CREATE POLICY "tier_configs_select_client" ON public.tier_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.profile_id = auth.uid()
        AND c.tenant_id  = tier_configs.tenant_id
        AND c.deleted_at IS NULL
    )
  );

-- ─── 4. Idempotency guard on loyalty_transactions (earn per appointment) ──────
-- Prevents double point assignment if the completion action fires twice.
-- Uses a partial unique index: only one 'earn' row per appointment_id.

CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_one_earn_per_appt
  ON public.loyalty_transactions(appointment_id)
  WHERE type = 'earn' AND appointment_id IS NOT NULL;

-- ─── 5. Unique index guard on loyalty_configs active config ──────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_configs_active
  ON public.loyalty_configs(tenant_id)
  WHERE ended_at IS NULL;

-- ─── 6. Seed default tier_configs for every existing tenant ──────────────────
INSERT INTO public.tier_configs (tenant_id, tier_name, tier_label, min_points, benefits, visual_style, display_order)
SELECT
  t.id,
  tier.tier_name,
  tier.tier_label,
  tier.min_points,
  tier.benefits::jsonb,
  tier.visual_style::jsonb,
  tier.display_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('bronze',  'Bronzo',   0,     '{"priority_booking":false,"bonus_points_pct":0,"permanent_discount_pct":0,"upgrade_service":false,"birthday_reward":false}', '{"border_color":"#cd7f32","gradient":"linear-gradient(135deg,#cd7f32,#a0522d)"}',   0),
  ('silver',  'Argento',  2500,  '{"priority_booking":true,"bonus_points_pct":10,"permanent_discount_pct":0,"upgrade_service":false,"birthday_reward":false}',  '{"border_color":"#bdbab0","gradient":"linear-gradient(135deg,#e8e6df,#bdbab0,#8a877e)"}', 1),
  ('gold',    'Oro',      5000,  '{"priority_booking":true,"bonus_points_pct":15,"permanent_discount_pct":5,"upgrade_service":true,"birthday_reward":false}',   '{"border_color":"#ffd700","gradient":"linear-gradient(135deg,#ffd700,#c8a04a)"}',  2),
  ('diamond', 'Diamante', 10000, '{"priority_booking":true,"bonus_points_pct":25,"permanent_discount_pct":10,"upgrade_service":true,"birthday_reward":true}',  '{"border_color":"#aa96da","gradient":"linear-gradient(135deg,#a8d8ea,#aa96da,#fcbad3)"}', 3)
) AS tier(tier_name, tier_label, min_points, benefits, visual_style, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tier_configs tc WHERE tc.tenant_id = t.id AND tc.tier_name = tier.tier_name
);

-- ─── 7. Seed default badges for every existing tenant ────────────────────────
INSERT INTO public.badges (tenant_id, name, description, icon_url, condition_type, condition_value, is_active, display_order)
SELECT
  t.id,
  b.name,
  b.description,
  b.icon_url,
  b.condition_type,
  b.condition_value,
  TRUE,
  b.display_order
FROM public.tenants t
CROSS JOIN (VALUES
  ('Prima Visita',       'Hai fatto la tua prima visita!',                    '/img/badges/badge-prima-visita.svg',   'visits_count',              1,  0),
  ('5 Visite',           'Sei un habitué del salone.',                        '/img/badges/badge-5-visite.svg',       'visits_count',              5,  1),
  ('10 Visite',          'Doppia cifra! Benvenuto nella famiglia.',           '/img/badges/badge-10-visite.svg',      'visits_count',             10,  2),
  ('Cliente Fedele',     'Un anno insieme — grazie per la fiducia.',          '/img/badges/badge-fedele-anno.svg',    'months_since_first_visit',  12, 3),
  ('Streak di Fuoco',    '5 visite consecutive — stai costruendo qualcosa.',  '/img/badges/badge-streak-5.svg',       'streak_count',              5,  4),
  ('Leggenda della Streak', '10 visite consecutive — sei un esempio.',        '/img/badges/badge-streak-10.svg',      'streak_count',             10,  5),
  ('VIP',                'Hai raggiunto la fascia Oro. Rispetto.',           '/img/badges/badge-vip.svg',             'points_total',           5000,  6),
  ('Leggenda',           'Diamante. Il livello massimo. Sei una leggenda.',   '/img/badges/badge-leggenda.svg',       'points_total',          10000,  7)
) AS b(name, description, icon_url, condition_type, condition_value, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.badges bg WHERE bg.tenant_id = t.id AND bg.name = b.name
);
