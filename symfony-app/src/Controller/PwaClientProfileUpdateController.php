<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class PwaClientProfileUpdateController extends AbstractController
{
    public function __construct(
        private readonly TokenStorageInterface $tokenStorage,
        private readonly JWTTokenManagerInterface $jwtTokenManager,
        private readonly Connection $connection,
    ) {}

    #[Route('/api/pwa/client/profile', methods: ['PATCH'])]
    public function __invoke(Request $request): JsonResponse
    {
        $token = $this->tokenStorage->getToken();
        if ($token === null) {
            return $this->json(['error' => 'Non autenticato.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $claims = $this->jwtTokenManager->decode($token);
        } catch (\Throwable) {
            return $this->json(['error' => 'Token non valido.'], Response::HTTP_UNAUTHORIZED);
        }

        $clientId = $claims['client_id'] ?? null;
        $roles = (array) ($claims['roles'] ?? []);

        if (!$clientId || !\in_array('ROLE_PWA_CLIENT', $roles, true)) {
            return $this->json(['error' => 'Accesso non autorizzato.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $fullName = trim((string) ($payload['full_name'] ?? ''));
        $phone = isset($payload['phone']) ? trim((string) $payload['phone']) : null;

        if ($fullName === '') {
            return $this->json(['error' => 'Il nome è obbligatorio.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = $this->connection->executeStatement(
            'UPDATE clients SET full_name = :full_name, phone = :phone, updated_at = now()
             WHERE id = :client_id AND deleted_at IS NULL',
            [
                'full_name' => $fullName,
                'phone' => $phone !== '' ? $phone : null,
                'client_id' => $clientId,
            ],
        );

        if ($updated === 0) {
            return $this->json(['error' => 'Cliente non trovato.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json(['success' => true]);
    }
}
