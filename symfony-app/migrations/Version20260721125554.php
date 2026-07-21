<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721125554 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add tenant-scoped gallery, website, and portfolio photo tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE gallery_photos (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                photo_url TEXT NOT NULL,
                caption TEXT DEFAULT NULL,
                display_order INT DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT gallery_photos_pkey PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_D1D5B209033212A ON gallery_photos (tenant_id)');
        $this->addSql('ALTER TABLE gallery_photos ADD CONSTRAINT FK_D1D5B209033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE website_photos (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                url TEXT NOT NULL,
                sort_order INT DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT website_photos_pkey PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_website_photos_tenant_sort ON website_photos (tenant_id, sort_order)');
        $this->addSql('ALTER TABLE website_photos ADD CONSTRAINT website_photos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE portfolio_photos (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                staff_id UUID DEFAULT NULL,
                photo_url TEXT NOT NULL,
                service_tags TEXT[] DEFAULT '{}' NOT NULL,
                is_visible BOOLEAN DEFAULT true NOT NULL,
                display_order INT DEFAULT 0 NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT portfolio_photos_pkey PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX portfolio_photos_tenant_idx ON portfolio_photos (tenant_id, display_order)');
        $this->addSql('CREATE INDEX portfolio_photos_staff_idx ON portfolio_photos (staff_id)');
        $this->addSql('ALTER TABLE portfolio_photos ADD CONSTRAINT portfolio_photos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE portfolio_photos ADD CONSTRAINT portfolio_photos_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES staff_members (id) ON DELETE SET NULL NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS portfolio_photos');
        $this->addSql('DROP TABLE IF EXISTS website_photos');
        $this->addSql('DROP TABLE IF EXISTS gallery_photos');
    }
}
