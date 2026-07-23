<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use ApiPlatform\Validator\Exception\ValidationException;
use App\Entity\Client;
use App\Entity\Tenant;
use App\Security\TenantContext;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;

/**
 * Handles POST and PATCH on Client.
 *
 * POST: injects current tenant from JWT context, validates phone uniqueness, persists.
 * PATCH: validates phone uniqueness if phone changed, persists.
 */
final class ClientPersistProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Client
    {
        \assert($data instanceof Client);

        if ($operation instanceof Post) {
            $tenantId = $this->tenantContext->getTenantId();
            if ($tenantId === null) {
                throw new \RuntimeException('Nessun contesto tenant per la creazione del cliente.');
            }

            $tenant = $this->em->getReference(Tenant::class, $tenantId);
            $data->setTenant($tenant);
        }

        $this->persistSafely($data);

        return $data;
    }

    private function persistSafely(Client $client): void
    {
        try {
            $this->em->persist($client);
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            $violations = new ConstraintViolationList([
                new ConstraintViolation(
                    message: 'Numero di telefono già associato a un cliente di questo tenant.',
                    messageTemplate: 'Numero di telefono già associato a un cliente di questo tenant.',
                    parameters: [],
                    root: $client,
                    propertyPath: 'phone',
                    invalidValue: $client->getPhone(),
                ),
            ]);

            throw new ValidationException($violations);
        }
    }
}
