<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\StaffRegistrationConflictException;
use App\Service\StaffRegistrationInput;
use App\Service\StaffRegistrationService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class RegisterController extends AbstractController
{
    public function __construct(
        private readonly StaffRegistrationService $staffRegistrationService,
        private readonly JWTTokenManagerInterface $jwtTokenManager,
    ) {}

    #[Route('/api/register', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Payload JSON non valido.'], Response::HTTP_BAD_REQUEST);
        }

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $businessName = trim((string) ($payload['business_name'] ?? ''));
        $fullName = trim((string) ($payload['full_name'] ?? ''));
        $businessType = trim((string) ($payload['business_type'] ?? ''));

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Email non valida.'], Response::HTTP_BAD_REQUEST);
        }

        if (mb_strlen($password) < 8) {
            return $this->json(
                ['error' => 'La password deve avere almeno 8 caratteri.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if (mb_strlen($businessName) < 2) {
            return $this->json(
                ['error' => 'Il nome attività è obbligatorio.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        if ($fullName !== '' && mb_strlen($fullName) < 2) {
            return $this->json(
                ['error' => 'Il nome completo deve avere almeno 2 caratteri.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        try {
            $registration = $this->staffRegistrationService->register(new StaffRegistrationInput(
                email: $email,
                password: $password,
                businessName: $businessName,
                fullName: $fullName !== '' ? $fullName : null,
                businessType: $businessType !== '' ? $businessType : null,
            ));
        } catch (StaffRegistrationConflictException $exception) {
            if ($exception->reason === StaffRegistrationConflictException::EMAIL_ALREADY_USED) {
                return $this->json(['error' => 'Email già in uso.'], Response::HTTP_CONFLICT);
            }

            throw $exception;
        }

        return $this->json([
            'token' => $this->jwtTokenManager->create($registration->user),
            'tenantSlug' => $registration->tenant->getSlug(),
            'currentRole' => $registration->staffMember->getRole(),
        ], Response::HTTP_CREATED);
    }
}
