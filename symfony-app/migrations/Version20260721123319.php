<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721123319 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add legal acceptance events and pending proof tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE legal_acceptance_events (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                user_id UUID NOT NULL,
                profile_id UUID NOT NULL,
                tenant_id UUID DEFAULT NULL,
                accepted_by UUID NOT NULL,
                document_type VARCHAR(30) NOT NULL,
                document_version TEXT NOT NULL,
                privacy_notice_version TEXT NOT NULL,
                accepted_at TIMESTAMPTZ NOT NULL,
                source VARCHAR(40) NOT NULL,
                metadata JSONB DEFAULT '{}' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT legal_acceptance_events_pkey PRIMARY KEY (id),
                CONSTRAINT legal_acceptance_events_user_document_version_idx UNIQUE (user_id, document_type, document_version),
                CONSTRAINT legal_acceptance_events_document_type_check CHECK (document_type IN ('B2B_TERMS')),
                CONSTRAINT legal_acceptance_events_source_check CHECK (source IN ('EMAIL_PASSWORD_REGISTER', 'GOOGLE_OAUTH_REGISTER')),
                CONSTRAINT legal_acceptance_events_document_version_check CHECK (btrim(document_version) <> ''),
                CONSTRAINT legal_acceptance_events_privacy_notice_version_check CHECK (btrim(privacy_notice_version) <> '')
            )
        SQL);
        $this->addSql('CREATE INDEX legal_acceptance_events_user_timeline_idx ON legal_acceptance_events (user_id, accepted_at, created_at)');
        $this->addSql('CREATE INDEX legal_acceptance_events_tenant_timeline_idx ON legal_acceptance_events (tenant_id, accepted_at, created_at)');
        $this->addSql('CREATE INDEX IDX_86F44396CCFA12B8 ON legal_acceptance_events (profile_id)');
        $this->addSql('CREATE INDEX IDX_86F44396E7D54635 ON legal_acceptance_events (accepted_by)');
        $this->addSql('ALTER TABLE legal_acceptance_events ADD CONSTRAINT FK_86F44396A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE legal_acceptance_events ADD CONSTRAINT FK_86F44396CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE legal_acceptance_events ADD CONSTRAINT FK_86F443969033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE legal_acceptance_events ADD CONSTRAINT FK_86F44396E7D54635 FOREIGN KEY (accepted_by) REFERENCES profiles (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql("COMMENT ON TABLE legal_acceptance_events IS 'Append-only audit trail of accepted B2B legal documents for root-domain barber registrations.'");
        $this->addSql("COMMENT ON COLUMN legal_acceptance_events.privacy_notice_version IS 'Version of the B2B privacy notice shown and acknowledged at the time of terms acceptance.'");
        $this->addSql(<<<'SQL'
            CREATE OR REPLACE FUNCTION guard_legal_acceptance_events_immutability()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            SET search_path = public
            AS $$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    RAISE EXCEPTION 'legal_acceptance_events rows are immutable and cannot be deleted';
                END IF;

                IF TG_OP = 'UPDATE' THEN
                    IF
                        OLD.tenant_id IS NULL
                        AND NEW.tenant_id IS NOT NULL
                        AND NEW.user_id = OLD.user_id
                        AND NEW.profile_id = OLD.profile_id
                        AND NEW.document_type = OLD.document_type
                        AND NEW.document_version = OLD.document_version
                        AND NEW.privacy_notice_version = OLD.privacy_notice_version
                        AND NEW.accepted_at = OLD.accepted_at
                        AND NEW.accepted_by = OLD.accepted_by
                        AND NEW.source = OLD.source
                        AND NEW.metadata = OLD.metadata
                        AND NEW.created_at = OLD.created_at
                    THEN
                        RETURN NEW;
                    END IF;

                    RAISE EXCEPTION 'legal_acceptance_events rows are immutable except for a one-time tenant backfill';
                END IF;

                RETURN NEW;
            END;
            $$;
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TRIGGER legal_acceptance_events_guard_immutability
            BEFORE UPDATE OR DELETE ON legal_acceptance_events
            FOR EACH ROW
            EXECUTE FUNCTION guard_legal_acceptance_events_immutability()
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE legal_acceptance_pending (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                consumed_by_user_id UUID DEFAULT NULL,
                token_hash TEXT NOT NULL,
                context_token_hash TEXT DEFAULT NULL,
                source VARCHAR(40) NOT NULL,
                document_type VARCHAR(30) NOT NULL,
                document_version TEXT NOT NULL,
                privacy_notice_version TEXT NOT NULL,
                accepted_at TIMESTAMPTZ NOT NULL,
                accepted_by_email TEXT DEFAULT NULL,
                metadata JSONB DEFAULT '{}' NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                consumed_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT legal_acceptance_pending_pkey PRIMARY KEY (id),
                CONSTRAINT legal_acceptance_pending_token_hash_key UNIQUE (token_hash),
                CONSTRAINT legal_acceptance_pending_document_type_check CHECK (document_type IN ('B2B_TERMS')),
                CONSTRAINT legal_acceptance_pending_source_check CHECK (source IN ('EMAIL_PASSWORD_REGISTER', 'GOOGLE_OAUTH_REGISTER')),
                CONSTRAINT legal_acceptance_pending_token_hash_check CHECK (btrim(token_hash) <> ''),
                CONSTRAINT legal_acceptance_pending_document_version_check CHECK (btrim(document_version) <> ''),
                CONSTRAINT legal_acceptance_pending_privacy_notice_version_check CHECK (btrim(privacy_notice_version) <> ''),
                CONSTRAINT legal_acceptance_pending_expiration_check CHECK (expires_at > accepted_at)
            )
        SQL);
        $this->addSql('CREATE INDEX legal_acceptance_pending_expires_at_idx ON legal_acceptance_pending (expires_at)');
        $this->addSql('CREATE INDEX legal_acceptance_pending_source_idx ON legal_acceptance_pending (source, accepted_at)');
        $this->addSql('CREATE INDEX IDX_40994D4B1C54B3E2 ON legal_acceptance_pending (consumed_by_user_id)');
        $this->addSql('ALTER TABLE legal_acceptance_pending ADD CONSTRAINT FK_40994D4B1C54B3E2 FOREIGN KEY (consumed_by_user_id) REFERENCES users (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql("COMMENT ON TABLE legal_acceptance_pending IS 'Single-use, short-lived proofs created before completing a root-domain B2B registration.'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS legal_acceptance_pending');
        $this->addSql('DROP TRIGGER IF EXISTS legal_acceptance_events_guard_immutability ON legal_acceptance_events');
        $this->addSql('DROP FUNCTION IF EXISTS guard_legal_acceptance_events_immutability()');
        $this->addSql('DROP TABLE IF EXISTS legal_acceptance_events');
    }
}
