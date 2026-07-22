<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

final class SuperadminAccessChecker
{
    public function __construct(
        private readonly Connection $connection,
    ) {}

    public function requireAuthenticatedSuperadmin(?object $user): User
    {
        if (!$user instanceof User) {
            throw new UnauthorizedHttpException('Bearer', 'Unauthorized');
        }

        if (!$this->isSuperadmin($user)) {
            throw new AccessDeniedHttpException('Permessi insufficienti.');
        }

        return $user;
    }

    public function isSuperadmin(User $user): bool
    {
        $value = $this->connection->fetchOne(
            'SELECT is_superadmin FROM profiles WHERE id = :id',
            ['id' => $user->getId()->toRfc4122()],
        );

        return $value === true || $value === 't' || $value === '1' || $value === 1;
    }
}
