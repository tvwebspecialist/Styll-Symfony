<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create backup_run table for PostgreSQL backup tracking';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE backup_run (
                id          UUID        NOT NULL PRIMARY KEY,
                started_at  TIMESTAMPTZ,
                finished_at TIMESTAMPTZ,
                status      VARCHAR(20) NOT NULL,
                file_name   VARCHAR(500),
                size_bytes  BIGINT,
                error_message TEXT,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        SQL);

        $this->addSql('CREATE INDEX idx_backup_run_created_at ON backup_run (created_at DESC)');
        $this->addSql('CREATE INDEX idx_backup_run_status ON backup_run (status)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS backup_run');
    }
}
