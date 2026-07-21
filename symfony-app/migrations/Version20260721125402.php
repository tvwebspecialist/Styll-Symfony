<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721125402 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add platform notifications, platform leads, and tenant usage counters';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE platform_notifications (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID DEFAULT NULL,
                related_profile_id UUID DEFAULT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT DEFAULT NULL,
                meta JSONB DEFAULT '{}' NOT NULL,
                is_read BOOLEAN DEFAULT false NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT platform_notifications_pkey PRIMARY KEY (id),
                CONSTRAINT platform_notifications_type_check CHECK (type IN ('tenant_created', 'tenant_suspended', 'tenant_reactivated', 'user_registered_staff'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_platform_notifications_created ON platform_notifications (created_at)');
        $this->addSql('CREATE INDEX idx_platform_notifications_unread ON platform_notifications (is_read, created_at) WHERE is_read = false');
        $this->addSql('CREATE INDEX IDX_D9D22BA09033212A ON platform_notifications (tenant_id)');
        $this->addSql('CREATE INDEX IDX_D9D22BA01A82C9F6 ON platform_notifications (related_profile_id)');
        $this->addSql('ALTER TABLE platform_notifications ADD CONSTRAINT FK_D9D22BA09033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE platform_notifications ADD CONSTRAINT FK_D9D22BA01A82C9F6 FOREIGN KEY (related_profile_id) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE platform_leads (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                converted_tenant_id UUID DEFAULT NULL,
                email TEXT NOT NULL,
                phone TEXT DEFAULT NULL,
                business_name TEXT DEFAULT NULL,
                source VARCHAR(40) DEFAULT 'trial_signup' NOT NULL,
                posthog_distinct_id TEXT DEFAULT NULL,
                consent_marketing BOOLEAN DEFAULT false NOT NULL,
                consent_at TIMESTAMPTZ DEFAULT NULL,
                status VARCHAR(30) DEFAULT 'new' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT platform_leads_pkey PRIMARY KEY (id),
                CONSTRAINT uq_platform_leads_email UNIQUE (email),
                CONSTRAINT platform_leads_source_check CHECK (source IN ('trial_signup', 'demo_request', 'content_download', 'chat')),
                CONSTRAINT platform_leads_status_check CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_platform_leads_status ON platform_leads (status)');
        $this->addSql('CREATE INDEX idx_platform_leads_created ON platform_leads (created_at)');
        $this->addSql('CREATE INDEX IDX_1AB184864D40E806 ON platform_leads (converted_tenant_id)');
        $this->addSql('ALTER TABLE platform_leads ADD CONSTRAINT FK_1AB184864D40E806 FOREIGN KEY (converted_tenant_id) REFERENCES tenants (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE TRIGGER trg_platform_leads_updated_at BEFORE UPDATE ON platform_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

        $this->addSql(<<<'SQL'
            CREATE TABLE tenant_usage_counters (
                tenant_id UUID NOT NULL,
                period_month DATE NOT NULL,
                metric VARCHAR(40) NOT NULL,
                count BIGINT DEFAULT 0 NOT NULL,
                cost_cents BIGINT DEFAULT 0 NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT tenant_usage_counters_pkey PRIMARY KEY (tenant_id, period_month, metric),
                CONSTRAINT tenant_usage_counters_metric_check CHECK (metric IN (
                    'sms_sent',
                    'whatsapp_sent',
                    'email_sent',
                    'push_sent',
                    'ai_requests',
                    'ai_input_tokens',
                    'ai_output_tokens'
                )),
                CONSTRAINT tenant_usage_counters_count_check CHECK (count >= 0),
                CONSTRAINT tenant_usage_counters_cost_cents_check CHECK (cost_cents >= 0)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_tenant_usage_counters_period_metric ON tenant_usage_counters (period_month, metric)');
        $this->addSql('ALTER TABLE tenant_usage_counters ADD CONSTRAINT FK_5B490F589033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS tenant_usage_counters');
        $this->addSql('DROP TABLE IF EXISTS platform_leads');
        $this->addSql('DROP TABLE IF EXISTS platform_notifications');
    }
}
