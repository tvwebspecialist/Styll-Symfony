<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class UpdateMyPasswordController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

    #[Route('/api/me/password', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non autorizzato.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $currentPassword = is_string($payload['currentPassword'] ?? null)
            ? trim($payload['currentPassword'])
            : '';
        $newPassword = is_string($payload['newPassword'] ?? null)
            ? trim($payload['newPassword'])
            : '';

        if ($currentPassword === '' || $newPassword === '') {
            return $this->json(
                ['error' => 'Password attuale e nuova password sono obbligatorie.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (!$this->passwordHasher->isPasswordValid($user, $currentPassword)) {
            return $this->json(['error' => 'Password attuale non corretta.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (mb_strlen($newPassword) < 8) {
            return $this->json(
                ['error' => 'La nuova password deve avere almeno 8 caratteri.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if ($currentPassword === $newPassword) {
            return $this->json(
                ['error' => 'La nuova password deve essere diversa da quella attuale.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, $newPassword));
        $this->em->flush();

        return $this->json(['success' => true], Response::HTTP_OK);
    }
}
