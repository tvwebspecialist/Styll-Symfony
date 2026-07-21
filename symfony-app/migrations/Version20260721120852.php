<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721120852 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add client import jobs, team invitations, onboarding tokens, and email verification tokens';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE client_import_jobs (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                initiated_by UUID DEFAULT NULL,
                source VARCHAR(50) DEFAULT NULL,
                filename VARCHAR(500) DEFAULT NULL,
                total_rows INT DEFAULT 0 NOT NULL,
                imported_count INT DEFAULT 0 NOT NULL,
                skipped_count INT DEFAULT 0 NOT NULL,
                error_count INT DEFAULT 0 NOT NULL,
                merged_count INT DEFAULT 0 NOT NULL,
                errors JSONB DEFAULT '[]' NOT NULL,
                status VARCHAR(20) DEFAULT 'completed' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT client_import_jobs_pkey PRIMARY KEY (id),
                CONSTRAINT client_import_jobs_source_check CHECK (source IS NULL OR source IN ('fresha', 'treatwell', 'booksy', 'csv_generic')),
                CONSTRAINT client_import_jobs_status_check CHECK (status IN ('completed', 'partial', 'failed'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_client_import_jobs_tenant ON client_import_jobs (tenant_id, created_at)');
        $this->addSql('CREATE INDEX IDX_BBB1D54754C6E0B7 ON client_import_jobs (initiated_by)');
        $this->addSql('ALTER TABLE client_import_jobs ADD CONSTRAINT FK_BBB1D5479033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE client_import_jobs ADD CONSTRAINT FK_BBB1D54754C6E0B7 FOREIGN KEY (initiated_by) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE team_invitations (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                created_by UUID DEFAULT NULL,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(128) NOT NULL,
                role VARCHAR(20) DEFAULT 'staff' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL,
                accepted_at TIMESTAMPTZ DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                CONSTRAINT team_invitations_pkey PRIMARY KEY (id),
                CONSTRAINT team_invitations_token_key UNIQUE (token),
                CONSTRAINT team_invitations_valid_role CHECK (role IN ('owner', 'manager', 'staff', 'receptionist')),
                CONSTRAINT team_invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX team_invitations_tenant_email_pending_idx ON team_invitations (tenant_id, email) WHERE status = \'pending\'');
        $this->addSql('CREATE INDEX idx_team_invitations_token ON team_invitations (token)');
        $this->addSql('CREATE INDEX idx_team_invitations_tenant_email ON team_invitations (tenant_id, email, status)');
        $this->addSql('CREATE INDEX idx_team_invitations_expires_at ON team_invitations (expires_at) WHERE status = \'pending\'');
        $this->addSql('CREATE INDEX IDX_4EBB482FDE12AB56 ON team_invitations (created_by)');
        $this->addSql('ALTER TABLE team_invitations ADD CONSTRAINT FK_4EBB482F9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE team_invitations ADD CONSTRAINT FK_4EBB482FDE12AB56 FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE onboarding_tokens (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                created_by UUID DEFAULT NULL,
                token VARCHAR(32) NOT NULL,
                barbiere_email VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days') NOT NULL,
                used_at TIMESTAMPTZ DEFAULT NULL,
                used_by_email VARCHAR(255) DEFAULT NULL,
                active BOOLEAN DEFAULT true NOT NULL,
                CONSTRAINT onboarding_tokens_pkey PRIMARY KEY (id),
                CONSTRAINT onboarding_tokens_token_key UNIQUE (token)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_onboarding_tokens_token ON onboarding_tokens (token)');
        $this->addSql('CREATE INDEX idx_onboarding_tokens_active ON onboarding_tokens (active, expires_at)');
        $this->addSql('CREATE INDEX idx_onboarding_tokens_created_by ON onboarding_tokens (created_by, created_at)');
        $this->addSql('ALTER TABLE onboarding_tokens ADD CONSTRAINT FK_C3B4049BDE12AB56 FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE email_verification_tokens (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                email VARCHAR(255) NOT NULL,
                code VARCHAR(20) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT false NOT NULL,
                attempts INT DEFAULT 0 NOT NULL,
                locked_until TIMESTAMPTZ DEFAULT NULL,
                last_sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_evt_email ON email_verification_tokens (email)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS email_verification_tokens');
        $this->addSql('DROP TABLE IF EXISTS onboarding_tokens');
        $this->addSql('DROP TABLE IF EXISTS team_invitations');
        $this->addSql('DROP TABLE IF EXISTS client_import_jobs');
    }
}
