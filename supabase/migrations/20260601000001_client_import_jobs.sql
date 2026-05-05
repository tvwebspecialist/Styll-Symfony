-- ─────────────────────────────────────────────────────────────
-- client_import_jobs — audit trail degli import clienti
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,                          -- 'fresha' | 'treatwell' | 'booksy' | 'csv_generic'
  filename TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,     -- array di {row, field, message}
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'partial' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_import_jobs_tenant
  ON client_import_jobs(tenant_id, created_at DESC);

ALTER TABLE client_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members read import jobs" ON client_import_jobs;
CREATE POLICY "tenant members read import jobs" ON client_import_jobs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM staff_members
      WHERE profile_id = auth.uid() AND is_active = true
    )
  );
