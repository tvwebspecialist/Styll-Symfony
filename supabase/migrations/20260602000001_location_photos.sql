-- FIX 5: Add photos column to locations table for multi-photo upload
ALTER TABLE locations ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';
