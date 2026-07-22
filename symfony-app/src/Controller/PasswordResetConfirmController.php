<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\PasswordResetService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PasswordResetConfirmController extends AbstractController
{
    public function __construct(
        private readonly PasswordResetService $passwordResetService,
    ) {}

    #[Route('/api/password-reset/confirm', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $token = trim((string) ($payload['token'] ?? ''));
        $newPassword = (string) ($payload['new_password'] ?? '');

        if ($token === '') {
            return $this->json(['error' => 'Token mancante.'], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->passwordResetService->confirmReset($token, $newPassword);

        if (!$result->success) {
            return $this->json(['error' => $result->error], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->json(['message' => 'Password aggiornata. Puoi ora accedere con la nuova password.']);
    }
}
