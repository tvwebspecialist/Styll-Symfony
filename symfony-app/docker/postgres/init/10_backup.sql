-- Backup run tracking (infrastructure — not tenant-scoped)
CREATE TABLE IF NOT EXISTS backup_run (
    id            UUID        NOT NULL PRIMARY KEY,
    started_at    TIMESTAMPTZ,
    finished_at   TIMESTAMPTZ,
    status        VARCHAR(20) NOT NULL,
    file_name     VARCHAR(500),
    size_bytes    BIGINT,
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_run_created_at ON backup_run (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_run_status     ON backup_run (status);
