<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Reward;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * GET /api/rewards
 *
 * Returns active rewards for the current tenant, ordered by display_order ASC.
 * TenantFilter automatically scopes to current tenant — no cross-tenant leak possible.
 */
#[Route('/api/rewards', name: 'api_rewards', methods: ['GET'])]
final class RewardsController extends AbstractController
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

        /** @var Reward[] $rewards */
        $rewards = $this->em->createQueryBuilder()
            ->select('r')
            ->from(Reward::class, 'r')
            ->where('r.isActive = true')
            ->orderBy('r.displayOrder', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(
            static fn (Reward $r): array => [
                'id'           => (string) $r->getId(),
                'name'         => $r->getName(),
                'description'  => $r->getDescription(),
                'pointsCost'   => $r->getPointsCost(),
                'rewardType'   => $r->getRewardType(),
                'displayOrder' => $r->getDisplayOrder(),
                'isActive'     => $r->isActive(),
            ],
            $rewards,
        ));
    }
}
