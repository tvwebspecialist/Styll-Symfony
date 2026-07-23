<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260722200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Align Symfony profiles with admin migration requirements by adding email and is_superadmin';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email)');
        $this->addSql('CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON profiles (is_superadmin)');
        $this->addSql(<<<'SQL'
            UPDATE profiles p
            SET email = u.email
            FROM users u
            WHERE u.id = p.id
              AND (p.email IS NULL OR p.email = '')
        SQL);
        $this->addSql(<<<'SQL'
            UPDATE profiles p
            SET is_superadmin = true
            FROM users u
            WHERE u.id = p.id
              AND u.roles::text LIKE '%ROLE_SUPERADMIN%'
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IF EXISTS idx_profiles_email');
        $this->addSql('DROP INDEX IF EXISTS idx_profiles_is_superadmin');
        $this->addSql('ALTER TABLE profiles DROP COLUMN IF EXISTS email');
        $this->addSql('ALTER TABLE profiles DROP COLUMN IF EXISTS is_superadmin');
    }
}
