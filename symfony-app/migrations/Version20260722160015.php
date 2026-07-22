<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260722160015 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow Symfony clients created via Google OAuth bootstrap to persist without a phone number';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE clients SET phone = '' WHERE phone IS NULL");
        $this->addSql('ALTER TABLE clients ALTER COLUMN phone SET NOT NULL');
    }
}
