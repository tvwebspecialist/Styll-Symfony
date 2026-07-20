-- ============================================================
-- inbox-db-setup.sql
-- Creates the styll_inbox_test database and applies the minimal
-- schema stubs needed to run inbox-db.test.sql.
--
-- Run as: psql -h /tmp -p 5432 -d postgres -f inbox-db-setup.sql
-- ============================================================

\set ON_ERROR_STOP on

-- Drop and recreate isolated test database
DROP DATABASE IF EXISTS styll_inbox_test;
CREATE DATABASE styll_inbox_test;
