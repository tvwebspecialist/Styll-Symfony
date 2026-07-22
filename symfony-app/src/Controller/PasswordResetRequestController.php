<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\PasswordResetService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PasswordResetRequestController extends AbstractController
{
    public function __construct(
        private readonly PasswordResetService $passwordResetService,
    ) {}

    #[Route('/api/password-reset/request', methods: ['POST'])]
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

        // Always fire-and-forget: no hint about whether the email exists.
        $this->passwordResetService->requestReset($email);

        return $this->json([
            'message' => 'Se questa email è associata a un account, riceverai un link per reimpostare la password.',
        ]);
    }
}
