<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Client;
use App\Entity\EmailVerificationToken;
use App\Entity\Profile;
use App\Entity\User;
use App\Repository\ClientRepository;
use App\Repository\EmailVerificationTokenRepository;
use App\Repository\ProfileRepository;
use App\Repository\TenantRepository;
use App\Repository\UserRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PwaClientEmailOtpService
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_MINUTES = 15;
    private const OTP_TTL_MINUTES = 15;
    private const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Connection $connection,
        private readonly EmailVerificationTokenRepository $tokenRepository,
        private readonly TenantRepository $tenantRepository,
        private readonly UserRepository $userRepository,
        private readonly ProfileRepository $profileRepository,
        private readonly ClientRepository $clientRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly JWTTokenManagerInterface $jwtTokenManager,
        private readonly LoggerInterface $logger,
    ) {}

    public function sendOtp(string $email): string|null
    {
        $existing = $this->tokenRepository->findActiveSendToken($email);

        if ($existing !== null) {
            $cooldownEnd = $existing->getLastSentAt()->modify(sprintf('+%d seconds', self::RESEND_COOLDOWN_SECONDS));
            if (new \DateTimeImmutable() < $cooldownEnd) {
                // Within cooldown — no new token issued, return null to tell the controller to respond OK silently
                return null;
            }
        }

        $this->tokenRepository->invalidateAllForEmail($email);

        $otp = $this->generateOtp();

        $token = new EmailVerificationToken();
        $token->setEmail($email);
        $token->setCode($otp);
        $token->setExpiresAt((new \DateTimeImmutable())->modify(sprintf('+%d minutes', self::OTP_TTL_MINUTES)));

        $this->em->persist($token);
        $this->em->flush();

        $this->logger->info('[PwaClientOtp] OTP generated', [
            'email' => $email,
            'otp' => $otp,
            'expires_minutes' => self::OTP_TTL_MINUTES,
        ]);

        return $otp;
    }

    public function verifyOtp(
        string $email,
        string $code,
        string $tenantSlug,
        ?string $fullName = null,
        ?string $phone = null,
    ): PwaClientOtpResult {
        $activeToken = $this->tokenRepository->findActiveForEmail($email);

        if ($activeToken === null) {
            return PwaClientOtpResult::fail('Codice scaduto. Richiedi un nuovo codice.');
        }

        if ($activeToken->getLockedUntil() !== null && $activeToken->getLockedUntil() > new \DateTimeImmutable()) {
            return PwaClientOtpResult::fail('Troppi tentativi. Attendi qualche minuto prima di riprovare.');
        }

        if ($activeToken->getCode() !== $code) {
            $attempts = $activeToken->getAttempts() + 1;
            $activeToken->setAttempts($attempts);

            if ($attempts >= self::MAX_ATTEMPTS) {
                $activeToken->setLockedUntil((new \DateTimeImmutable())->modify(sprintf('+%d minutes', self::LOCKOUT_MINUTES)));
            }

            $this->em->flush();

            return PwaClientOtpResult::fail('Codice non valido. Riprova.');
        }

        // Valid code — mark used immediately to prevent replay
        $activeToken->setUsed(true);
        $this->em->flush();

        $tenant = $this->tenantRepository->findOneBy(['slug' => $tenantSlug, 'status' => 'active']);
        if ($tenant === null) {
            return PwaClientOtpResult::fail('Salone non trovato o non attivo.');
        }

        $user = null;
        $profile = null;
        $client = null;
        $isNewClient = false;

        $this->connection->beginTransaction();
        try {
            $this->withoutTenantFilter(function () use (
                $email, $tenant, $fullName, $phone, &$user, &$profile, &$client, &$isNewClient
            ): void {
                $user = $this->userRepository->findOneBy(['email' => $email]);
                if ($user === null) {
                    $user = new User();
                    $user->setEmail($email);
                    $user->setRoles(['ROLE_USER']);
                    $user->setPassword($this->passwordHasher->hashPassword($user, bin2hex(random_bytes(32))));
                    $this->em->persist($user);
                }

                $profile = $this->profileRepository->find($user->getId());
                if ($profile === null) {
                    $profile = new Profile($user);
                    $this->em->persist($profile);
                }

                if ($profile->getUserType() !== 'staff') {
                    $profile->setUserType('client');
                }

                if ($fullName !== null && trim($fullName) !== '' && trim((string) $profile->getFullName()) === '') {
                    $profile->setFullName(trim($fullName));
                }

                $client = $this->findActiveClientByProfile($tenant, $profile);
                $isNewClient = false;

                if ($client === null) {
                    $client = $this->findActiveUnlinkedClientByEmail($tenant, $email);
                }

                if ($client !== null) {
                    $client->setProfile($profile);
                    if ($fullName !== null && trim($fullName) !== '' && trim($client->getFullName()) === '') {
                        $client->setFullName(trim($fullName));
                    }
                    if ($phone !== null && trim($phone) !== '' && $client->getPhone() === null) {
                        $client->setPhone(trim($phone));
                    }
                } else {
                    $client = (new Client())
                        ->setTenant($tenant)
                        ->setProfile($profile)
                        ->setFullName(trim($fullName ?? '') !== '' ? trim($fullName) : $this->nameFromEmail($email))
                        ->setPhone($phone !== null && trim($phone) !== '' ? trim($phone) : null)
                        ->setEmail($email)
                        ->setPreferredContactChannel('email')
                        ->setMarketingConsent(false)
                        ->setTags([]);

                    $this->em->persist($client);
                    $isNewClient = true;
                }
            });

            $this->em->flush();
            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            $this->logger->error('[PwaClientOtp] Provisioning failed', [
                'email' => $email,
                'tenant_slug' => $tenantSlug,
                'error' => $exception->getMessage(),
            ]);

            return PwaClientOtpResult::fail('Qualcosa è andato storto. Riprova.');
        }

        if (!$user instanceof User || !$client instanceof Client) {
            return PwaClientOtpResult::fail('Qualcosa è andato storto. Riprova.');
        }

        $jwt = $this->jwtTokenManager->createFromPayload($user, [
            'roles' => ['ROLE_PWA_CLIENT'],
            'client_id' => $client->getId()->toRfc4122(),
            'tenant_id' => $tenant->getId()->toRfc4122(),
            'tenant_slug' => $tenant->getSlug(),
            'email' => $email,
        ]);

        return PwaClientOtpResult::ok($isNewClient, $jwt);
    }

    /**
     * Temporarily disables tenant_filter for queries that must run outside a tenant context
     * (same pattern as GoogleOAuthFlowService).
     */
    private function withoutTenantFilter(callable $callback): void
    {
        $filters = $this->em->getFilters();
        $wasEnabled = $filters->isEnabled('tenant_filter');

        if ($wasEnabled) {
            $filters->disable('tenant_filter');
        }

        try {
            $callback();
        } finally {
            if ($wasEnabled) {
                $filters->enable('tenant_filter');
            }
        }
    }

    private function generateOtp(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', \STR_PAD_LEFT);
    }

    private function nameFromEmail(string $email): string
    {
        $local = explode('@', $email, 2)[0] ?? $email;
        $normalized = trim((string) preg_replace('/[^a-z0-9]+/i', ' ', $local));

        return $normalized !== ''
            ? mb_convert_case($normalized, \MB_CASE_TITLE, 'UTF-8')
            : 'Cliente';
    }

    private function findActiveClientByProfile(\App\Entity\Tenant $tenant, Profile $profile): ?Client
    {
        return $this->clientRepository->createQueryBuilder('c')
            ->where('c.tenant = :tenant')
            ->andWhere('c.profile = :profile')
            ->andWhere('c.deletedAt IS NULL')
            ->setParameter('tenant', $tenant)
            ->setParameter('profile', $profile)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function findActiveUnlinkedClientByEmail(\App\Entity\Tenant $tenant, string $email): ?Client
    {
        return $this->clientRepository->createQueryBuilder('c')
            ->where('c.tenant = :tenant')
            ->andWhere('c.email = :email')
            ->andWhere('c.profile IS NULL')
            ->andWhere('c.deletedAt IS NULL')
            ->setParameter('tenant', $tenant)
            ->setParameter('email', $email)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
