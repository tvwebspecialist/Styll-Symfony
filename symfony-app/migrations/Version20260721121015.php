<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721121015 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add notifications, notification_log, and push_subscriptions tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE notifications (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                profile_id UUID DEFAULT NULL,
                type VARCHAR(40) NOT NULL,
                title VARCHAR(255) NOT NULL,
                body TEXT DEFAULT NULL,
                meta JSONB DEFAULT '{}' NOT NULL,
                is_read BOOLEAN DEFAULT false NOT NULL,
                read_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT notifications_pkey PRIMARY KEY (id),
                CONSTRAINT notifications_type_check CHECK (type IN (
                    'new_booking',
                    'cancellation',
                    'new_client',
                    'churn_alert',
                    'low_stock',
                    'loyalty_milestone',
                    'reschedule',
                    'booking_confirmed',
                    'reminder_3d',
                    'reminder_1d',
                    'reminder_day',
                    'promotion_published',
                    'campaign'
                ))
            )
        SQL);
        $this->addSql('CREATE INDEX idx_notifications_tenant_created ON notifications (tenant_id, created_at)');
        $this->addSql('CREATE INDEX idx_notifications_unread ON notifications (tenant_id, is_read, created_at)');
        $this->addSql('CREATE INDEX IDX_6000B0D5CCFA12B8 ON notifications (profile_id)');
        $this->addSql('ALTER TABLE notifications ADD CONSTRAINT FK_6000B0D59033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notifications ADD CONSTRAINT FK_6000B0D5CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE push_subscriptions (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID DEFAULT NULL,
                profile_id UUID NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh_key TEXT NOT NULL,
                auth_key TEXT NOT NULL,
                user_agent TEXT DEFAULT NULL,
                device_label VARCHAR(255) DEFAULT NULL,
                last_used_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
                CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_push_subscriptions_profile ON push_subscriptions (profile_id)');
        $this->addSql('CREATE INDEX idx_push_subscriptions_tenant ON push_subscriptions (tenant_id)');
        $this->addSql('ALTER TABLE push_subscriptions ADD CONSTRAINT FK_8304D9CA9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE push_subscriptions ADD CONSTRAINT FK_8304D9CACCFA12B8 FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE notification_log (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                profile_id UUID DEFAULT NULL,
                appointment_id UUID DEFAULT NULL,
                promotion_id UUID DEFAULT NULL,
                type VARCHAR(60) NOT NULL,
                sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT notification_log_pkey PRIMARY KEY (id),
                CONSTRAINT notification_log_unique UNIQUE (appointment_id, type)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_notification_log_profile ON notification_log (profile_id)');
        $this->addSql('CREATE INDEX idx_notification_log_tenant ON notification_log (tenant_id)');
        $this->addSql('CREATE INDEX idx_notification_log_sent_at ON notification_log (sent_at)');
        $this->addSql('CREATE INDEX idx_notification_log_promotion ON notification_log (promotion_id) WHERE promotion_id IS NOT NULL');
        $this->addSql('ALTER TABLE notification_log ADD CONSTRAINT FK_8C7EC6C69033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification_log ADD CONSTRAINT FK_8C7EC6C6CCFA12B8 FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification_log ADD CONSTRAINT FK_8C7EC6C6E5B533F9 FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE notification_log ADD CONSTRAINT FK_8C7EC6C6139DF194 FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS notification_log');
        $this->addSql('DROP TABLE IF EXISTS push_subscriptions');
        $this->addSql('DROP TABLE IF EXISTS notifications');
    }
}
