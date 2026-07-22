<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\GoogleOAuthFlowException;
use App\Service\GoogleOAuthCompleteInput;
use App\Service\GoogleOAuthCompleteResult;
use App\Service\GoogleOAuthFlowService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class GoogleOAuthCompleteController extends AbstractController
{
    public function __construct(
        private readonly GoogleOAuthFlowService $googleOAuthFlowService,
        private readonly JWTTokenManagerInterface $jwtTokenManager,
    ) {}

    #[Route('/api/oauth/google/complete', methods: ['POST'])]
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
            $result = $this->googleOAuthFlowService->complete(new GoogleOAuthCompleteInput(
                code: trim((string) ($payload['code'] ?? '')),
                state: trim((string) ($payload['state'] ?? '')),
                stateCookie: trim((string) ($payload['state_cookie'] ?? '')),
                redirectUri: trim((string) ($payload['redirect_uri'] ?? '')),
            ));
        } catch (GoogleOAuthFlowException $exception) {
            return $this->json(['error' => $exception->getMessage()], $exception->statusCode);
        }

        return $this->json($this->buildPayload($result));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(GoogleOAuthCompleteResult $result): array
    {
        if ($result->context === 'staff' && $result->staffUser !== null) {
            return [
                'context' => 'staff',
                'token' => $this->jwtTokenManager->create($result->staffUser),
                'redirectTo' => $result->redirectTo ?? '/dashboard',
            ];
        }

        return [
            'context' => 'pwa',
            'tenantSlug' => $result->tenantSlug,
            'returnTo' => $result->returnTo ?? '/profilo',
            'googleIdToken' => $result->googleIdToken,
            'googleAccessToken' => $result->googleAccessToken,
            'isNewClient' => $result->isNewClient,
        ];
    }
}
