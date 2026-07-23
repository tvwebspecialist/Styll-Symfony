<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260722180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add password_reset_tokens table for staff password reset via email';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE password_reset_tokens (
                id UUID DEFAULT gen_random_uuid() NOT NULL,
                email VARCHAR(255) NOT NULL,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN DEFAULT false NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
                CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id)
            )
        SQL);

        $this->addSql('CREATE INDEX idx_prt_email ON password_reset_tokens (email)');
        $this->addSql('CREATE UNIQUE INDEX idx_prt_token_hash ON password_reset_tokens (token_hash)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS password_reset_tokens');
    }
}
