<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * GET /api/clients/{id}/loyalty
 *
 * Returns the loyalty state for a specific client in the current tenant.
 *
 * 404 cases (both intentional, not 500):
 *   - Client UUID not found in current tenant (cross-tenant attempt or deleted client)
 *   - Client exists but has no loyalty record yet ("not enrolled" — legitimate state for new clients)
 *
 * Convention: 404 for "not enrolled" is consistent with REST semantics — the sub-resource
 * /clients/{id}/loyalty simply does not exist until the client earns their first points.
 * Frontend should show "no loyalty data" UI when it receives 404 on this endpoint.
 */
#[Route('/api/clients/{id}/loyalty', name: 'api_client_loyalty', methods: ['GET'])]
final class ClientLoyaltyController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(string $id): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            throw $this->createNotFoundException();
        }

        $clientUuid = Uuid::fromString($id);

        // TenantFilter auto-applies: cross-tenant clients return null → 404
        /** @var Client|null $client */
        $client = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.id = :clientId')
            ->andWhere('c.deletedAt IS NULL')
            ->setParameter('clientId', $clientUuid)
            ->getQuery()
            ->getOneOrNullResult();

        if ($client === null) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        // TenantFilter also auto-applies here
        /** @var ClientLoyalty|null $loyalty */
        $loyalty = $this->em->createQueryBuilder()
            ->select('l')
            ->from(ClientLoyalty::class, 'l')
            ->where('l.client = :client')
            ->setParameter('client', $client)
            ->getQuery()
            ->getOneOrNullResult();

        if ($loyalty === null) {
            throw $this->createNotFoundException('Cliente non ancora iscritto al programma fedeltà.');
        }

        return $this->json([
            'id'                 => (string) $loyalty->getId(),
            'clientId'           => $id,
            'totalPoints'        => $loyalty->getTotalPoints(),
            'availablePoints'    => $loyalty->getAvailablePoints(),
            'currentStreak'      => $loyalty->getCurrentStreak(),
            'longestStreak'      => $loyalty->getLongestStreak(),
            'currentTier'        => $loyalty->getCurrentTier(),
            'tierPointsThisYear' => $loyalty->getTierPointsThisYear(),
            'tierYear'           => $loyalty->getTierYear(),
            'tierGraceExpiresAt' => $loyalty->getTierGraceExpiresAt()?->format(\DateTimeInterface::ATOM),
            'lastVisitDate'      => $loyalty->getLastVisitDate()?->format('Y-m-d'),
            'updatedAt'          => $loyalty->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }
}
