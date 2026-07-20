-- ─── PostgreSQL extensions needed by Styll ───────────────────────────────────
-- Run order: first (no table dependencies)

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- exclusion constraint on appointments (tstzrange overlap)
