<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use App\Repository\PasswordResetTokenRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PasswordResetService
{
    private const RESET_URL_BASE = '%s/reset-password?token=%s';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PasswordResetTokenRepository $tokenRepository,
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly LoggerInterface $logger,
        private readonly string $appBaseUrl,
    ) {}

    /**
     * Generates a reset token and logs the link.
     * Always returns the same generic message to avoid user enumeration.
     */
    public function requestReset(string $email): void
    {
        $user = $this->userRepository->findOneBy(['email' => $email]);

        if ($user === null) {
            // Constant-time noop: no hint whether email exists.
            return;
        }

        $resetUrl = $this->issueResetLinkForUser($user);

        $this->logger->info('[PasswordReset] Reset link generated', [
            'email' => $email,
            'reset_url' => $resetUrl,
        ]);
    }

    public function issueResetLinkForUser(User $user): string
    {
        [$token, $resetUrl] = $this->createResetTokenAndUrl($user->getEmail());

        $this->logger->info('[PasswordReset] Setup/reset link issued programmatically', [
            'email' => $user->getEmail(),
            'reset_url' => $resetUrl,
            'expires_at' => $token->getExpiresAt()->format(\DateTimeInterface::ATOM),
        ]);

        return $resetUrl;
    }

    public function confirmReset(string $rawToken, string $newPassword): PasswordResetConfirmResult
    {
        if (mb_strlen($newPassword) < 8) {
            return PasswordResetConfirmResult::invalid('La password deve avere almeno 8 caratteri.');
        }

        $tokenHash = hash('sha256', $rawToken);
        $token = $this->tokenRepository->findValidByHash($tokenHash);

        if ($token === null) {
            return PasswordResetConfirmResult::invalid('Token non valido o scaduto.');
        }

        $user = $this->userRepository->findOneBy(['email' => $token->getEmail()]);
        if ($user === null) {
            return PasswordResetConfirmResult::invalid('Token non valido o scaduto.');
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, $newPassword));
        $token->setUsed(true);

        $this->em->flush();

        return PasswordResetConfirmResult::ok();
    }

    /**
     * @return array{0: PasswordResetToken, 1: string}
     */
    private function createResetTokenAndUrl(string $email): array
    {
        $this->tokenRepository->invalidatePendingForEmail($email);

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $token = new PasswordResetToken();
        $token->setEmail($email);
        $token->setTokenHash($tokenHash);

        $this->em->persist($token);
        $this->em->flush();

        $resetUrl = sprintf(self::RESET_URL_BASE, rtrim($this->appBaseUrl, '/'), $rawToken);

        return [$token, $resetUrl];
    }
}
