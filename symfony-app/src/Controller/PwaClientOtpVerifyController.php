<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\PwaClientEmailOtpService;
use App\Security\RateLimiting\AuthRateLimiter;
use App\Security\RateLimiting\RateLimitResponseFactory;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PwaClientOtpVerifyController extends AbstractController
{
    public function __construct(
        private readonly PwaClientEmailOtpService $otpService,
        private readonly AuthRateLimiter $authRateLimiter,
        private readonly RateLimitResponseFactory $rateLimitResponseFactory,
    ) {}

    #[Route('/api/pwa/otp/verify', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $code = trim((string) ($payload['code'] ?? ''));
        $tenantSlug = trim((string) ($payload['tenant_slug'] ?? ''));
        $fullName = isset($payload['full_name']) ? trim((string) $payload['full_name']) : null;
        $phone = isset($payload['phone']) ? trim((string) $payload['phone']) : null;

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Email non valida.'], Response::HTTP_BAD_REQUEST);
        }

        if ($code === '' || strlen($code) !== 6) {
            return $this->json(['error' => 'Codice OTP non valido.'], Response::HTTP_BAD_REQUEST);
        }

        if ($tenantSlug === '') {
            return $this->json(['error' => 'Tenant non specificato.'], Response::HTTP_BAD_REQUEST);
        }

        $rateLimit = $this->authRateLimiter->checkPwaOtpVerify($request, $email);
        if ($rateLimit !== null) {
            return $this->rateLimitResponseFactory->create($rateLimit);
        }

        $result = $this->otpService->verifyOtp($email, $code, $tenantSlug, $fullName ?: null, $phone ?: null);

        if (!$result->success) {
            $this->authRateLimiter->registerPwaOtpVerifyFailure($request, $email);

            return $this->json(['error' => $result->error], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->json([
            'is_new_client' => $result->isNewClient,
            'token' => $result->jwt,
        ]);
    }
}
