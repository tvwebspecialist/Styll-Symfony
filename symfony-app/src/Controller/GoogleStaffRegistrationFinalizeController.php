<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\GoogleOAuthFlowException;
use App\Service\GoogleStaffProvisioningInput;
use App\Service\GoogleStaffRegistrationPendingSigner;
use App\Service\StaffRegistrationService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GoogleStaffRegistrationFinalizeController extends AbstractController
{
    public function __construct(
        private readonly GoogleStaffRegistrationPendingSigner $pendingSigner,
        private readonly StaffRegistrationService $staffRegistrationService,
        private readonly JWTTokenManagerInterface $jwtTokenManager,
        private readonly EntityManagerInterface $em,
    ) {}

    #[Route('/api/register/google/finalize', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $pendingToken = trim((string) ($payload['pending_token'] ?? ''));
        $businessName = trim((string) ($payload['business_name'] ?? ''));
        $businessType = trim((string) ($payload['business_type'] ?? ''));
        $acceptedTerms = (bool) ($payload['accepted_terms'] ?? false);

        if (!$acceptedTerms) {
            return $this->json(
                ['error' => 'Devi accettare i Termini di Servizio per continuare.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (mb_strlen($businessName) < 2) {
            return $this->json(
                ['error' => 'Il nome attività è obbligatorio.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        try {
            $pending = $this->pendingSigner->verify($pendingToken);
        } catch (GoogleOAuthFlowException $exception) {
            return $this->json(['error' => $exception->getMessage()], $exception->statusCode);
        }

        $registration = $this->withoutTenantFilter(fn () => $this->staffRegistrationService->registerGoogleStaff(
            new GoogleStaffProvisioningInput(
                email: $pending->email,
                businessName: $businessName,
                fullName: $pending->fullName,
                businessType: $businessType !== '' ? $businessType : null,
                avatarUrl: $pending->avatarUrl,
            ),
        ));

        return $this->json([
            'token' => $this->jwtTokenManager->create($registration->user),
            'tenantSlug' => $registration->tenant->getSlug(),
            'currentRole' => $registration->staffMember->getRole(),
        ], Response::HTTP_CREATED);
    }

    /**
     * Google finalize runs before tenant resolution and must bypass the
     * fail-closed Doctrine tenant filter during provisioning.
     *
     * @template T
     *
     * @param callable(): T $callback
     *
     * @return T
     */
    private function withoutTenantFilter(callable $callback): mixed
    {
        $filters = $this->em->getFilters();
        $wasEnabled = $filters->isEnabled('tenant_filter');

        if ($wasEnabled) {
            $filters->disable('tenant_filter');
        }

        try {
            return $callback();
        } finally {
            if ($wasEnabled && !$filters->isEnabled('tenant_filter')) {
                $filters->enable('tenant_filter');
            }
        }
    }
}
