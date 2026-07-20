-- additive migration: adds optional splash screen background color to tenants.
-- NULL = use primary_color at runtime (fallback handled in application layer).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS splash_color TEXT NULL;
