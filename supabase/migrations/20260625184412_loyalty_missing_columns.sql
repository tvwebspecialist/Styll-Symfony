-- ─── loyalty_configs.is_active ────────────────────────────────────────────────
ALTER TABLE public.loyalty_configs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── client_loyalty — colonne tier ───────────────────────────────────────────
ALTER TABLE public.client_loyalty
  ADD COLUMN IF NOT EXISTS current_tier          TEXT        NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS tier_points_this_year INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tier_year             INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  ADD COLUMN IF NOT EXISTS tier_grace_expires_at TIMESTAMPTZ;

-- Backfill current_tier basato su total_points (soglie statiche)
UPDATE public.client_loyalty
SET current_tier = CASE
  WHEN total_points >= 10000 THEN 'diamond'
  WHEN total_points >= 5000  THEN 'gold'
  WHEN total_points >= 2500  THEN 'silver'
  ELSE 'bronze'
END;

-- ─── loyalty_transactions.loyalty_config_version ─────────────────────────────
ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS loyalty_config_version INTEGER;;
