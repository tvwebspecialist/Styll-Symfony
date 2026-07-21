<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721123103 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add GDPR privacy requests, marketing unsubscribe tokens, and analytics consent events';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE client_privacy_requests (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                client_id UUID DEFAULT NULL,
                profile_id UUID DEFAULT NULL,
                action VARCHAR(30) NOT NULL,
                status VARCHAR(20) NOT NULL,
                details JSONB DEFAULT '{}' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT client_privacy_requests_pkey PRIMARY KEY (id),
                CONSTRAINT client_privacy_requests_action_check CHECK (action IN ('access_export', 'access_review', 'rectification', 'erasure', 'restriction')),
                CONSTRAINT client_privacy_requests_status_check CHECK (status IN ('completed', 'submitted', 'rejected'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_client_privacy_requests_tenant_profile_timeline ON client_privacy_requests (tenant_id, profile_id, created_at)');
        $this->addSql('CREATE INDEX idx_client_privacy_requests_tenant_client_timeline ON client_privacy_requests (tenant_id, client_id, created_at)');
        $this->addSql('ALTER TABLE client_privacy_requests ADD CONSTRAINT FK_B953B39F9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE client_privacy_requests ADD CONSTRAINT FK_B953B39F19EB6921 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE client_privacy_requests ADD CONSTRAINT FK_B953B39FCCFA12B8 FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql("COMMENT ON TABLE client_privacy_requests IS 'Append-only audit trail for B2C data-subject-rights requests and self-service actions.'");

        $this->addSql(<<<'SQL'
            CREATE TABLE marketing_unsubscribe_tokens (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                client_id UUID NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                consumed_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT marketing_unsubscribe_tokens_pkey PRIMARY KEY (id),
                CONSTRAINT marketing_unsubscribe_tokens_token_hash_key UNIQUE (token_hash)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_marketing_unsubscribe_tokens_lookup ON marketing_unsubscribe_tokens (tenant_id, token_hash)');
        $this->addSql('CREATE INDEX idx_marketing_unsubscribe_tokens_expires_at ON marketing_unsubscribe_tokens (expires_at)');
        $this->addSql('ALTER TABLE marketing_unsubscribe_tokens ADD CONSTRAINT FK_662BCFA79033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE marketing_unsubscribe_tokens ADD CONSTRAINT FK_662BCFA719EB6921 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql("COMMENT ON TABLE marketing_unsubscribe_tokens IS 'Opaque hashed tokens used to revoke marketing consent from client-facing promotional emails.'");
        $this->addSql("COMMENT ON COLUMN marketing_unsubscribe_tokens.expires_at IS 'Token validity deadline. Tokens are issued with a 30-day lifetime and cleaned up after expiry.'");

        $this->addSql(<<<'SQL'
            CREATE TABLE analytics_consent_events (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                anonymous_id TEXT NOT NULL,
                host TEXT NOT NULL,
                surface VARCHAR(30) NOT NULL,
                status VARCHAR(20) NOT NULL,
                policy_version TEXT NOT NULL,
                occurred_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                ip_address INET DEFAULT NULL,
                user_agent TEXT DEFAULT NULL,
                source VARCHAR(40) NOT NULL,
                metadata JSONB DEFAULT '{}' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT analytics_consent_events_pkey PRIMARY KEY (id),
                CONSTRAINT analytics_consent_events_surface_check CHECK (surface IN ('PLATFORM', 'TENANT_WEBSITE', 'TENANT_PWA', 'TENANT_DASHBOARD')),
                CONSTRAINT analytics_consent_events_status_check CHECK (status IN ('accepted', 'rejected')),
                CONSTRAINT analytics_consent_events_source_check CHECK (source IN ('BANNER', 'PREFERENCES_CENTER', 'COOKIE_POLICY', 'LOCAL_STORAGE_MIGRATION')),
                CONSTRAINT analytics_consent_events_policy_version_check CHECK (btrim(policy_version) <> ''),
                CONSTRAINT analytics_consent_events_host_check CHECK (btrim(host) <> '')
            )
        SQL);
        $this->addSql('CREATE INDEX idx_analytics_consent_host_surface_anon_timeline ON analytics_consent_events (host, surface, anonymous_id, occurred_at, created_at)');
        $this->addSql('CREATE INDEX idx_analytics_consent_surface_timeline ON analytics_consent_events (surface, occurred_at)');
        $this->addSql("COMMENT ON TABLE analytics_consent_events IS 'Append-only server-side proof of analytics consent choices, scoped by host, surface, and anonymous browser identifier.'");
        $this->addSql(<<<'SQL'
            CREATE OR REPLACE FUNCTION guard_analytics_consent_events_append_only()
            RETURNS trigger
            LANGUAGE plpgsql
            SET search_path = public
            AS $$
            BEGIN
                IF TG_OP = 'UPDATE' THEN
                    RAISE EXCEPTION 'analytics_consent_events is append-only and cannot be updated';
                END IF;

                IF TG_OP = 'DELETE' AND pg_trigger_depth() = 1 THEN
                    RAISE EXCEPTION 'analytics_consent_events is append-only and cannot be deleted directly';
                END IF;

                RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
            END;
            $$;
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TRIGGER trg_guard_analytics_consent_events_append_only
            BEFORE UPDATE OR DELETE ON analytics_consent_events
            FOR EACH ROW
            EXECUTE FUNCTION guard_analytics_consent_events_append_only()
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_guard_analytics_consent_events_append_only ON analytics_consent_events');
        $this->addSql('DROP FUNCTION IF EXISTS guard_analytics_consent_events_append_only()');
        $this->addSql('DROP TABLE IF EXISTS analytics_consent_events');
        $this->addSql('DROP TABLE IF EXISTS marketing_unsubscribe_tokens');
        $this->addSql('DROP TABLE IF EXISTS client_privacy_requests');
    }
}
