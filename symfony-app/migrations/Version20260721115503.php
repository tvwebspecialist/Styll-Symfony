<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260721115503 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Baseline existing bootstrap SQL schema; intentionally empty because the current database was created by docker/postgres/init scripts.';
    }

    public function up(Schema $schema): void
    {
        // Baseline only: existing tables were created by docker/postgres/init/*.sql before Doctrine Migrations adoption.
    }

    public function down(Schema $schema): void
    {
        // No-op: reverting a baseline must not drop the pre-existing bootstrap schema.
    }
}
