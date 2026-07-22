<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260722233000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add site analytics daily rollup and tenant activity log tables for Symfony admin analytics';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE site_analytics_daily (
                tenant_id UUID NOT NULL,
                date DATE NOT NULL,
                app_surface VARCHAR(16) NOT NULL,
                unique_visitors INTEGER NOT NULL DEFAULT 0,
                sessions INTEGER NOT NULL DEFAULT 0,
                page_views INTEGER NOT NULL DEFAULT 0,
                booking_started_count INTEGER NOT NULL DEFAULT 0,
                booking_completed_count INTEGER NOT NULL DEFAULT 0,
                signup_count INTEGER NOT NULL DEFAULT 0,
                conversion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
                top_referrers JSONB NOT NULL DEFAULT '[]'::jsonb,
                device_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (tenant_id, date, app_surface),
                CONSTRAINT chk_site_analytics_daily_surface
                    CHECK (app_surface IN ('website', 'pwa'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_site_analytics_daily_tenant_date ON site_analytics_daily (tenant_id, date DESC)');
        $this->addSql('CREATE INDEX idx_site_analytics_daily_surface ON site_analytics_daily (tenant_id, app_surface, date DESC)');
        $this->addSql('ALTER TABLE site_analytics_daily ADD CONSTRAINT fk_site_analytics_daily_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_activity_log (
                id UUID NOT NULL,
                tenant_id UUID NOT NULL,
                last_login_at TIMESTAMPTZ DEFAULT NULL,
                appointments_this_month INTEGER NOT NULL DEFAULT 0,
                active_clients_count INTEGER NOT NULL DEFAULT 0,
                total_revenue_this_month NUMERIC(12, 2) NOT NULL DEFAULT 0,
                recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_tenant_activity_log_tenant_recorded ON tenant_activity_log (tenant_id, recorded_at DESC, created_at DESC)');
        $this->addSql('ALTER TABLE tenant_activity_log ADD CONSTRAINT fk_tenant_activity_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS tenant_activity_log');
        $this->addSql('DROP TABLE IF EXISTS site_analytics_daily');
    }
}
