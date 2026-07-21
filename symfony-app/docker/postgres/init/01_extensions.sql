-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- ─── PostgreSQL extensions needed by Styll ───────────────────────────────────
-- Run order: first (no table dependencies)

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion constraint on appointments (tstzrange overlap)
