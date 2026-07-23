<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Client;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Implements soft delete for Client: sets deleted_at instead of removing the row.
 */
final class SoftDeleteClientProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): void
    {
        \assert($data instanceof Client);

        $data->setDeletedAt(new \DateTimeImmutable());
        $this->em->flush();
    }
}
