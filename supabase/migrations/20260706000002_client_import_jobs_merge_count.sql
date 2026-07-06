-- Track how many duplicate rows were merged into existing clients or pending inserts.
ALTER TABLE public.client_import_jobs
  ADD COLUMN IF NOT EXISTS merged_count INT NOT NULL DEFAULT 0;
