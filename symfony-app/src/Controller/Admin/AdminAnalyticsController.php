<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Security\SuperadminAccessChecker;
use App\Service\AdminAnalyticsService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/admin')]
final class AdminAnalyticsController extends AbstractController
{
    public function __construct(
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly AdminAnalyticsService $adminAnalyticsService,
    ) {}

    #[Route('/analytics', methods: ['GET'])]
    public function platformAnalytics(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        return $this->json(
            $this->adminAnalyticsService->getPlatformAnalytics($this->parsePeriod($request)),
        );
    }

    #[Route('/tenants/{tenantId}/analytics', methods: ['GET'])]
    public function tenantAnalytics(string $tenantId, Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        if (!Uuid::isValid($tenantId)) {
            throw new NotFoundHttpException('Tenant not found.');
        }

        $data = $this->adminAnalyticsService->getTenantAnalytics($tenantId, $this->parsePeriod($request));
        if ($data === null) {
            throw new NotFoundHttpException('Tenant not found.');
        }

        return $this->json($data);
    }

    private function requireSuperadminUser(): User
    {
        $user = $this->getUser();
        \assert($user === null || $user instanceof User);

        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($user);
    }

    private function parsePeriod(Request $request): int
    {
        return (int) $request->query->get('days', 30);
    }
}
