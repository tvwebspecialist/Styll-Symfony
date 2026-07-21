<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721125231 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add admin audit log, admin settings, and global email templates';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE admin_audit_log (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                actor_id UUID DEFAULT NULL,
                tenant_id UUID DEFAULT NULL,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT DEFAULT NULL,
                details JSONB DEFAULT '{}' NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX admin_audit_log_created_at_idx ON admin_audit_log (created_at)');
        $this->addSql('CREATE INDEX admin_audit_log_tenant_idx ON admin_audit_log (tenant_id)');
        $this->addSql('CREATE INDEX admin_audit_log_entity_idx ON admin_audit_log (entity_type, entity_id)');
        $this->addSql('CREATE INDEX IDX_72AC5A6D10DAF24A ON admin_audit_log (actor_id)');
        $this->addSql('ALTER TABLE admin_audit_log ADD CONSTRAINT FK_72AC5A6D10DAF24A FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE admin_audit_log ADD CONSTRAINT FK_72AC5A6D9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE admin_settings (
                key TEXT NOT NULL,
                value JSONB DEFAULT '{}' NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_by UUID DEFAULT NULL,
                CONSTRAINT admin_settings_pkey PRIMARY KEY (key)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_5F1F0AA829896901 ON admin_settings (updated_by)');
        $this->addSql('ALTER TABLE admin_settings ADD CONSTRAINT FK_5F1F0AA829896901 FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql(<<<'SQL'
            INSERT INTO admin_settings (key, value) VALUES
                ('feature_flags', '{"gamification": false, "win_back": false, "ai_coach": false}'::jsonb),
                ('maintenance', '{"enabled": false, "message": ""}'::jsonb),
                ('default_branding', '{"primary_color": "#000000", "secondary_color": "#ffffff", "logo_url": null}'::jsonb),
                ('security', '{"enforce_2fa_superadmin": false, "session_timeout_minutes": 60}'::jsonb)
            ON CONFLICT (key) DO NOTHING
        SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE email_templates (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                variables JSONB DEFAULT '[]' NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT email_templates_pkey PRIMARY KEY (id),
                CONSTRAINT email_templates_slug_key UNIQUE (slug)
            )
        SQL);
        $this->addSql('CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at()');
        $this->addSql(<<<'SQL'
            INSERT INTO email_templates (slug, name, subject, body, variables) VALUES
                ('welcome', 'Benvenuto', 'Benvenuto su Styll, {{full_name}}!', 'Ciao {{full_name}},\n\nGrazie per esserti registrato su Styll.', '["full_name"]'::jsonb),
                ('reminder', 'Promemoria appuntamento', 'Promemoria: appuntamento il {{date}}', 'Ciao {{client_name}},\n\nTi ricordiamo l''appuntamento del {{date}} alle {{time}} con {{staff_name}}.', '["client_name","date","time","staff_name"]'::jsonb),
                ('win_back', 'Ti aspettiamo', 'Ti manchiamo, {{client_name}}?', 'Ciao {{client_name}},\n\nÈ da un po'' che non ti vediamo. Torna a trovarci!', '["client_name"]'::jsonb)
            ON CONFLICT (slug) DO NOTHING
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS email_templates');
        $this->addSql('DROP TABLE IF EXISTS admin_settings');
        $this->addSql('DROP TABLE IF EXISTS admin_audit_log');
    }
}
