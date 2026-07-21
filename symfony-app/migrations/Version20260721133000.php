<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721133000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Complete public landing schema for Symfony read-only tenant endpoints';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE locations ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL");
        $this->addSql("ALTER TABLE locations ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb");
        $this->addSql("ALTER TABLE locations ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT true");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_locations_public_tenant ON locations (tenant_id, created_at) WHERE is_active = true AND show_on_website = true");

        $this->addSql("ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT true");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_staff_public_tenant ON staff_members (tenant_id, created_at) WHERE deleted_at IS NULL AND is_active = true AND show_on_website = true");

        $this->addSql("ALTER TABLE services ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT true");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_services_public_tenant ON services (tenant_id, display_order, name) WHERE is_active = true AND show_on_website = true");

        $this->addSql("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL");
        $this->addSql("ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0");
        $this->addSql("ALTER TABLE products ADD COLUMN IF NOT EXISTS show_on_site BOOLEAN NOT NULL DEFAULT true");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_products_public_tenant ON products (tenant_id, display_order, name) WHERE is_active = true AND show_on_site = true");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("DROP INDEX IF EXISTS idx_products_public_tenant");
        $this->addSql("ALTER TABLE products DROP COLUMN IF EXISTS show_on_site");
        $this->addSql("ALTER TABLE products DROP COLUMN IF EXISTS display_order");
        $this->addSql("ALTER TABLE products DROP COLUMN IF EXISTS description");

        $this->addSql("DROP INDEX IF EXISTS idx_services_public_tenant");
        $this->addSql("ALTER TABLE services DROP COLUMN IF EXISTS show_on_website");

        $this->addSql("DROP INDEX IF EXISTS idx_staff_public_tenant");
        $this->addSql("ALTER TABLE staff_members DROP COLUMN IF EXISTS show_on_website");

        $this->addSql("DROP INDEX IF EXISTS idx_locations_public_tenant");
        $this->addSql("ALTER TABLE locations DROP COLUMN IF EXISTS show_on_website");
        $this->addSql("ALTER TABLE locations DROP COLUMN IF EXISTS photos");
        $this->addSql("ALTER TABLE locations DROP COLUMN IF EXISTS photo_url");
    }
}
