<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721121146 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add message_templates, messages_log, and messaging_outbox tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE message_templates (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(40) NOT NULL,
                channel VARCHAR(20) NOT NULL,
                subject VARCHAR(255) DEFAULT NULL,
                body TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT message_templates_pkey PRIMARY KEY (id),
                CONSTRAINT message_templates_type_check CHECK (type IN ('reminder', 'confirmation', 'win_back', 'review_request', 'loyalty_update', 'custom')),
                CONSTRAINT message_templates_channel_check CHECK (channel IN ('sms', 'whatsapp', 'email', 'push'))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_message_templates_tenant_channel ON message_templates (tenant_id, channel, is_active)');
        $this->addSql('ALTER TABLE message_templates ADD CONSTRAINT FK_80E997509033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('CREATE TRIGGER trg_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

        $this->addSql(<<<'SQL'
            CREATE TABLE messages_log (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                client_id UUID DEFAULT NULL,
                template_id UUID DEFAULT NULL,
                channel VARCHAR(20) NOT NULL,
                type VARCHAR(60) NOT NULL,
                recipient VARCHAR(255) DEFAULT NULL,
                body_sent TEXT DEFAULT NULL,
                status VARCHAR(20) NOT NULL,
                cost NUMERIC(10, 4) DEFAULT NULL,
                cost_cents BIGINT DEFAULT 0 NOT NULL,
                external_id VARCHAR(255) DEFAULT NULL,
                sent_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT messages_log_pkey PRIMARY KEY (id),
                CONSTRAINT messages_log_channel_check CHECK (channel IN ('sms', 'whatsapp', 'email', 'push')),
                CONSTRAINT messages_log_status_check CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
                CONSTRAINT messages_log_cost_cents_check CHECK (cost_cents >= 0)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_messages_log_client_sent ON messages_log (tenant_id, client_id, sent_at)');
        $this->addSql('CREATE INDEX idx_messages_log_billing ON messages_log (tenant_id, sent_at, cost_cents)');
        $this->addSql('CREATE INDEX IDX_40F480FB19EB6921 ON messages_log (client_id)');
        $this->addSql('CREATE INDEX IDX_40F480FB5DA0FB8 ON messages_log (template_id)');
        $this->addSql('ALTER TABLE messages_log ADD CONSTRAINT FK_40F480FB9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messages_log ADD CONSTRAINT FK_40F480FB19EB6921 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messages_log ADD CONSTRAINT FK_40F480FB5DA0FB8 FOREIGN KEY (template_id) REFERENCES message_templates (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE messaging_outbox (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                client_id UUID DEFAULT NULL,
                appointment_id UUID DEFAULT NULL,
                template_id UUID DEFAULT NULL,
                messages_log_id UUID DEFAULT NULL,
                channel VARCHAR(20) NOT NULL,
                scheduled_for TIMESTAMPTZ DEFAULT now() NOT NULL,
                payload JSONB DEFAULT '{}' NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                attempts INT DEFAULT 0 NOT NULL,
                last_attempt_at TIMESTAMPTZ DEFAULT NULL,
                last_error TEXT DEFAULT NULL,
                idempotency_key VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT messaging_outbox_pkey PRIMARY KEY (id),
                CONSTRAINT messaging_outbox_idempotency_key_key UNIQUE (idempotency_key),
                CONSTRAINT messaging_outbox_channel_check CHECK (channel IN ('sms', 'whatsapp', 'email', 'push')),
                CONSTRAINT messaging_outbox_status_check CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
                CONSTRAINT messaging_outbox_attempts_check CHECK (attempts >= 0)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_messaging_outbox_pending_scheduled ON messaging_outbox (scheduled_for) WHERE status = \'pending\'');
        $this->addSql('CREATE INDEX IDX_B5DB120619EB6921 ON messaging_outbox (client_id)');
        $this->addSql('CREATE INDEX IDX_B5DB1206E5B533F9 ON messaging_outbox (appointment_id)');
        $this->addSql('CREATE INDEX IDX_B5DB12065DA0FB8 ON messaging_outbox (template_id)');
        $this->addSql('CREATE INDEX IDX_B5DB1206A74F93D1 ON messaging_outbox (messages_log_id)');
        $this->addSql('ALTER TABLE messaging_outbox ADD CONSTRAINT FK_B5DB12069033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messaging_outbox ADD CONSTRAINT FK_B5DB120619EB6921 FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messaging_outbox ADD CONSTRAINT FK_B5DB1206E5B533F9 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messaging_outbox ADD CONSTRAINT FK_B5DB12065DA0FB8 FOREIGN KEY (template_id) REFERENCES message_templates (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE messaging_outbox ADD CONSTRAINT FK_B5DB1206A74F93D1 FOREIGN KEY (messages_log_id) REFERENCES messages_log (id) ON DELETE SET NULL NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS messaging_outbox');
        $this->addSql('DROP TABLE IF EXISTS messages_log');
        $this->addSql('DROP TABLE IF EXISTS message_templates');
    }
}
