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

final class PwaClientOtpSendController extends AbstractController
{
    public function __construct(
        private readonly PwaClientEmailOtpService $otpService,
        private readonly AuthRateLimiter $authRateLimiter,
        private readonly RateLimitResponseFactory $rateLimitResponseFactory,
    ) {}

    #[Route('/api/pwa/otp/send', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Email non valida.'], Response::HTTP_BAD_REQUEST);
        }

        $rateLimit = $this->authRateLimiter->consumePwaOtpSend($request, $email);
        if ($rateLimit !== null) {
            return $this->rateLimitResponseFactory->create($rateLimit);
        }

        $this->otpService->sendOtp($email);

        return $this->json([
            'message' => 'Se l\'indirizzo email è valido, ti abbiamo inviato un codice di accesso.',
        ]);
    }
}
