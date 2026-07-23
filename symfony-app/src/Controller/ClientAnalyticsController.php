<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\ClientAnalytics;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Read-only analytics for a single client.
 * Values reflect the last aggregation run; calculation is handled by a separate pipeline.
 */
#[Route('/api/clients/{clientId}/analytics')]
final class ClientAnalyticsController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', methods: ['GET'])]
    public function show(string $clientId): JsonResponse
    {
        if (!Uuid::isValid($clientId)) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        $tenantId = $this->tenantContext->getTenantId();
        if ($tenantId === null) {
            throw $this->createAccessDeniedException();
        }

        $client = $this->em->getRepository(Client::class)->findOneBy([
            'id' => Uuid::fromString($clientId),
        ]);

        if ($client === null || $client->isDeleted() || !$client->getTenant()->getId()->equals($tenantId)) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        $analytics = $this->em->getRepository(ClientAnalytics::class)->findOneBy([
            'client' => $client,
        ]);

        if ($analytics === null) {
            return $this->json([
                'clientId' => $clientId,
                'totalVisits' => 0,
                'totalSpentServices' => '0.00',
                'totalSpentProducts' => '0.00',
                'averageSpendPerVisit' => null,
                'lastVisitDate' => null,
                'daysSinceLastVisit' => null,
                'averageDaysBetweenVisits' => null,
                'churnStatus' => 'green',
                'vipScore' => 0,
                'noShowCount' => 0,
                'cancellationCount' => 0,
                'referralCount' => 0,
                'lastReconciledAt' => null,
            ]);
        }

        return $this->json([
            'clientId' => $clientId,
            'totalVisits' => $analytics->getTotalVisits(),
            'totalSpentServices' => $analytics->getTotalSpentServices(),
            'totalSpentProducts' => $analytics->getTotalSpentProducts(),
            'averageSpendPerVisit' => $analytics->getAverageSpendPerVisit(),
            'lastVisitDate' => $analytics->getLastVisitDate()?->format('Y-m-d'),
            'daysSinceLastVisit' => $analytics->getDaysSinceLastVisit(),
            'averageDaysBetweenVisits' => $analytics->getAverageDaysBetweenVisits(),
            'churnStatus' => $analytics->getChurnStatus(),
            'vipScore' => $analytics->getVipScore(),
            'noShowCount' => $analytics->getNoShowCount(),
            'cancellationCount' => $analytics->getCancellationCount(),
            'referralCount' => $analytics->getReferralCount(),
            'lastReconciledAt' => $analytics->getLastReconciledAt()?->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_OK);
    }
}
