<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260722223000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add consent_events audit table for Symfony-admin client mutation flows';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE consent_events (
                id UUID NOT NULL,
                tenant_id UUID NOT NULL,
                client_id UUID NOT NULL,
                purpose VARCHAR(64) NOT NULL,
                channel VARCHAR(32) NOT NULL,
                status VARCHAR(32) NOT NULL,
                previous_status VARCHAR(32) NOT NULL,
                consent_text TEXT NOT NULL,
                consent_text_version VARCHAR(128) NOT NULL,
                legal_basis TEXT NOT NULL,
                source VARCHAR(64) NOT NULL,
                changed_by VARCHAR(64) NOT NULL,
                changed_by_profile_id UUID DEFAULT NULL,
                occurred_at TIMESTAMPTZ NOT NULL,
                ip_address INET DEFAULT NULL,
                user_agent TEXT DEFAULT NULL,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY(id)
            )
        SQL);

        $this->addSql('CREATE INDEX idx_consent_events_client_timeline ON consent_events (tenant_id, client_id, occurred_at DESC, created_at DESC)');
        $this->addSql('CREATE INDEX idx_consent_events_purpose_lookup ON consent_events (tenant_id, purpose, occurred_at DESC, created_at DESC)');
        $this->addSql('CREATE INDEX idx_consent_events_source_lookup ON consent_events (source, occurred_at DESC)');
        $this->addSql('ALTER TABLE consent_events ADD CONSTRAINT fk_consent_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE consent_events ADD CONSTRAINT fk_consent_events_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE consent_events ADD CONSTRAINT fk_consent_events_profile FOREIGN KEY (changed_by_profile_id) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE OR REPLACE FUNCTION guard_consent_events_append_only()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF TG_OP = 'UPDATE' THEN
                    RAISE EXCEPTION 'consent_events is append-only and cannot be updated';
                END IF;

                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'consent_events is append-only and cannot be deleted directly';
                END IF;

                RETURN NEW;
            END;
            $$;
        SQL);

        $this->addSql('DROP TRIGGER IF EXISTS trg_guard_consent_events_append_only ON consent_events');
        $this->addSql(<<<'SQL'
            CREATE TRIGGER trg_guard_consent_events_append_only
            BEFORE UPDATE OR DELETE ON consent_events
            FOR EACH ROW
            EXECUTE FUNCTION guard_consent_events_append_only()
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TRIGGER IF EXISTS trg_guard_consent_events_append_only ON consent_events');
        $this->addSql('DROP FUNCTION IF EXISTS guard_consent_events_append_only()');
        $this->addSql('DROP TABLE IF EXISTS consent_events');
    }
}
