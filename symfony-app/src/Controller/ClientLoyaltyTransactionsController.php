<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\LoyaltyTransaction;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * GET /api/clients/{id}/loyalty-transactions
 *
 * Returns paginated loyalty transaction history for a specific client.
 * Ordered by created_at DESC (newest first).
 *
 * Query params: ?page=1 (default 1), ?limit=20 (default 20, max 100)
 *
 * Response: { items: [...], total: N, page: N, limit: N }
 *
 * 404 if client not found in current tenant (cross-tenant guard).
 * TenantFilter scopes both Client and LoyaltyTransaction queries automatically.
 */
#[Route('/api/clients/{id}/loyalty-transactions', name: 'api_client_loyalty_transactions', methods: ['GET'])]
final class ClientLoyaltyTransactionsController extends AbstractController
{
    private const DEFAULT_LIMIT = 20;
    private const MAX_LIMIT = 100;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            throw $this->createNotFoundException();
        }

        // TenantFilter auto-applies: cross-tenant clients return null → 404
        /** @var Client|null $client */
        $client = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.id = :clientId')
            ->andWhere('c.deletedAt IS NULL')
            ->setParameter('clientId', Uuid::fromString($id))
            ->getQuery()
            ->getOneOrNullResult();

        if ($client === null) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        $page  = max(1, $request->query->getInt('page', 1));
        $limit = min(self::MAX_LIMIT, max(1, $request->query->getInt('limit', self::DEFAULT_LIMIT)));

        $total = (int) $this->em->createQueryBuilder()
            ->select('COUNT(t.id)')
            ->from(LoyaltyTransaction::class, 't')
            ->where('t.client = :client')
            ->setParameter('client', $client)
            ->getQuery()
            ->getSingleScalarResult();

        /** @var LoyaltyTransaction[] $transactions */
        $transactions = $this->em->createQueryBuilder()
            ->select('t')
            ->from(LoyaltyTransaction::class, 't')
            ->where('t.client = :client')
            ->orderBy('t.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->setParameter('client', $client)
            ->getQuery()
            ->getResult();

        return $this->json([
            'items' => array_map(
                static fn (LoyaltyTransaction $tx): array => [
                    'id'          => (string) $tx->getId(),
                    'type'        => $tx->getType(),
                    'points'      => $tx->getPoints(),
                    'description' => $tx->getDescription(),
                    'createdAt'   => $tx->getCreatedAt()->format(\DateTimeInterface::ATOM),
                ],
                $transactions,
            ),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }
}
