-- Historical/bootstrap SQL only.
-- Doctrine Migrations in symfony-app/migrations are the schema source of truth from the baseline onward.
-- Keep this file manually synchronized only while local fresh-volume bootstrap still depends on docker-entrypoint-initdb.d.

-- Create a sibling test database and apply the same bootstrap DDL used by the
-- development database. The Docker entrypoint runs the remaining SQL files
-- against POSTGRES_DB after this script completes.

SELECT current_database() || '_test' AS test_db \gset

SELECT format('CREATE DATABASE %I', :'test_db')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = :'test_db'
)
\gexec

\connect :test_db

\i /docker-entrypoint-initdb.d/01_extensions.sql
\i /docker-entrypoint-initdb.d/02_helpers.sql
\i /docker-entrypoint-initdb.d/03_auth.sql
\i /docker-entrypoint-initdb.d/04_business.sql
\i /docker-entrypoint-initdb.d/05_staff.sql
\i /docker-entrypoint-initdb.d/06_catalog.sql
\i /docker-entrypoint-initdb.d/07_crm.sql
\i /docker-entrypoint-initdb.d/08_calendar.sql
\i /docker-entrypoint-initdb.d/09_loyalty.sql
