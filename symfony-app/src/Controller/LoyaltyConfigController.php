<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\LoyaltyConfig;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/loyalty-config
 *
 * Returns the single active loyalty configuration for the current tenant.
 * Active = ended_at IS NULL (only one can exist at a time per DB unique partial index).
 *
 * 404 if the tenant has never configured loyalty or all configs are ended.
 * TenantFilter (Doctrine SQL filter) automatically scopes the query to the current tenant.
 */
#[Route('/api/loyalty-config', name: 'api_loyalty_config', methods: ['GET'])]
final class LoyaltyConfigController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        /** @var LoyaltyConfig|null $config */
        $config = $this->em->createQueryBuilder()
            ->select('c')
            ->from(LoyaltyConfig::class, 'c')
            ->where('c.endedAt IS NULL')
            ->orderBy('c.version', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($config === null) {
            throw $this->createNotFoundException('Nessuna configurazione loyalty attiva.');
        }

        return $this->json([
            'id'                  => (string) $config->getId(),
            'template'            => $config->getTemplate(),
            'isActive'            => $config->isActive(),
            'pointsPerVisit'      => $config->getPointsPerVisit(),
            'pointsPerEuro'       => $config->getPointsPerEuro(),
            'streakThresholdDays' => $config->getStreakThresholdDays(),
            'version'             => $config->getVersion(),
            'startedAt'           => $config->getStartedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }
}
