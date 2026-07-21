<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721120654 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add promotions, promotion_services, and promotion_products tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE promotions (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                service_id UUID DEFAULT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT NULL,
                discount_type VARCHAR(30) DEFAULT 'none' NOT NULL,
                discount_value NUMERIC(10, 2) DEFAULT NULL,
                valid_from TIMESTAMPTZ DEFAULT now() NOT NULL,
                valid_until TIMESTAMPTZ DEFAULT NULL,
                show_on_landing BOOLEAN DEFAULT true NOT NULL,
                show_in_app BOOLEAN DEFAULT true NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                display_order INT DEFAULT 0 NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT promotions_pkey PRIMARY KEY (id),
                CONSTRAINT promotions_discount_type_check CHECK (discount_type IN ('percent', 'fixed', 'free_service', 'none'))
            )
        SQL);
        $this->addSql('CREATE INDEX promotions_tenant_id_idx ON promotions (tenant_id)');
        $this->addSql('CREATE INDEX promotions_active_idx ON promotions (is_active, valid_until)');
        $this->addSql('CREATE INDEX IDX_EA1B3034ED5CA9E6 ON promotions (service_id)');
        $this->addSql('ALTER TABLE promotions ADD CONSTRAINT FK_EA1B30349033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE promotions ADD CONSTRAINT FK_EA1B3034ED5CA9E6 FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

        $this->addSql(<<<'SQL'
            CREATE TABLE promotion_services (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                promotion_id UUID NOT NULL,
                service_id UUID NOT NULL,
                discount_type VARCHAR(30) NOT NULL,
                discount_value NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT promotion_services_pkey PRIMARY KEY (id),
                CONSTRAINT promotion_services_discount_type_check CHECK (discount_type IN ('percent', 'fixed'))
            )
        SQL);
        $this->addSql('CREATE INDEX promotion_services_promotion_id_idx ON promotion_services (promotion_id)');
        $this->addSql('CREATE INDEX promotion_services_service_id_idx ON promotion_services (service_id)');
        $this->addSql('CREATE INDEX promotion_services_tenant_id_idx ON promotion_services (tenant_id)');
        $this->addSql('ALTER TABLE promotion_services ADD CONSTRAINT FK_B566452D9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE promotion_services ADD CONSTRAINT FK_B566452D139DF194 FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE promotion_services ADD CONSTRAINT FK_B566452DED5CA9E6 FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE NOT DEFERRABLE');

        $this->addSql(<<<'SQL'
            CREATE TABLE promotion_products (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                tenant_id UUID NOT NULL,
                promotion_id UUID NOT NULL,
                product_id UUID NOT NULL,
                discount_type VARCHAR(30) NOT NULL,
                discount_value NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT promotion_products_pkey PRIMARY KEY (id),
                CONSTRAINT promotion_products_discount_type_check CHECK (discount_type IN ('percent', 'fixed'))
            )
        SQL);
        $this->addSql('CREATE INDEX promotion_products_promotion_id_idx ON promotion_products (promotion_id)');
        $this->addSql('CREATE INDEX promotion_products_product_id_idx ON promotion_products (product_id)');
        $this->addSql('CREATE INDEX promotion_products_tenant_id_idx ON promotion_products (tenant_id)');
        $this->addSql('ALTER TABLE promotion_products ADD CONSTRAINT FK_75EEFE1E9033212A FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE promotion_products ADD CONSTRAINT FK_75EEFE1E139DF194 FOREIGN KEY (promotion_id) REFERENCES promotions (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE promotion_products ADD CONSTRAINT FK_75EEFE1E4584665A FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS promotion_products');
        $this->addSql('DROP TABLE IF EXISTS promotion_services');
        $this->addSql('DROP TABLE IF EXISTS promotions');
    }
}
