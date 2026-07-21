-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── Auth / Users ────────────────────────────────────────────────────────────
-- Replaces Supabase auth.users.
-- Symfony SecurityBundle reads from this table via UserProvider.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,           -- Symfony password_hasher bcrypt/argon2id output
  roles         JSONB NOT NULL DEFAULT '["ROLE_USER"]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Profiles (extended user info — 1:1 with users) ──────────────────────────
-- Replaces the Supabase profiles table that referenced auth.users(id).
-- profile_id on clients/staff_members now references profiles.id which references users.id.

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  user_type     TEXT NOT NULL DEFAULT 'staff'
                  CHECK (user_type IN ('staff', 'client', 'admin')),
  full_name     TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  language      TEXT DEFAULT 'it',
  timezone      TEXT DEFAULT 'Europe/Rome',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  work_mode     TEXT CHECK (work_mode IN ('solo', 'team')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
