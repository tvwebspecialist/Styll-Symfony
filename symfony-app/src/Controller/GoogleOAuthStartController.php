<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\GoogleOAuthFlowException;
use App\Service\GoogleOAuthFlowService;
use App\Service\GoogleOAuthStartInput;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GoogleOAuthStartController extends AbstractController
{
    public function __construct(
        private readonly GoogleOAuthFlowService $googleOAuthFlowService,
    ) {}

    #[Route('/api/oauth/google/start', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($payload)) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->googleOAuthFlowService->start(new GoogleOAuthStartInput(
                context: trim((string) ($payload['context'] ?? '')),
                redirectUri: trim((string) ($payload['redirect_uri'] ?? '')),
                redirectTo: $this->optionalString($payload['redirect_to'] ?? null),
                returnTo: $this->optionalString($payload['return_to'] ?? null),
                tenantSlug: $this->optionalString($payload['tenant_slug'] ?? null),
                fullName: $this->optionalString($payload['full_name'] ?? null),
                businessName: $this->optionalString($payload['business_name'] ?? null),
                businessType: $this->optionalString($payload['business_type'] ?? null),
                acceptedTerms: (bool) ($payload['accepted_terms'] ?? false),
            ));
        } catch (GoogleOAuthFlowException $exception) {
            return $this->json(['error' => $exception->getMessage()], $exception->statusCode);
        }

        return $this->json([
            'authorizationUrl' => $result->authorizationUrl,
            'stateToken' => $result->stateToken,
            'stateCookieMaxAge' => $result->stateCookieMaxAge,
        ]);
    }

    private function optionalString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
