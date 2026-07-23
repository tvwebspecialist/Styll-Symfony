<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Client;
use App\Entity\Profile;
use App\Entity\User;
use App\Exception\GoogleOAuthFlowException;
use App\Repository\ClientRepository;
use App\Repository\ProfileRepository;
use App\Repository\TenantRepository;
use App\Repository\UserRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PwaGoogleClientProvisioningService
{
    private const DEFAULT_TIMEZONE = 'Europe/Rome';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Connection $connection,
        private readonly UserRepository $userRepository,
        private readonly ProfileRepository $profileRepository,
        private readonly TenantRepository $tenantRepository,
        private readonly ClientRepository $clientRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

    public function provision(string $tenantSlug, GoogleOAuthIdentity $identity): PwaGoogleClientProvisioningResult
    {
        $tenant = $this->tenantRepository->findOneBy([
            'slug' => trim($tenantSlug),
            'status' => 'active',
        ]);

        if (!$tenant instanceof \App\Entity\Tenant) {
            throw GoogleOAuthFlowException::tenantNotFound();
        }

        $this->connection->beginTransaction();

        try {
            $user = $this->userRepository->findOneBy(['email' => $identity->email]);
            if (!$user instanceof User) {
                $user = new User();
                $user->setEmail($identity->email);
                $user->setRoles(['ROLE_USER']);
                $user->setPassword($this->passwordHasher->hashPassword($user, bin2hex(random_bytes(32))));
                $this->em->persist($user);
            }

            $profile = $this->profileRepository->find($user->getId());
            if (!$profile instanceof Profile) {
                $profile = new Profile($user);
                $this->em->persist($profile);
            }

            $this->synchronizeProfile($profile, $identity);

            $client = $this->findActiveClientByProfile($tenant, $profile);
            $isNewClient = false;

            if (!$client instanceof Client) {
                $client = $this->findActiveUnlinkedClientByEmail($tenant, $identity->email);
            }

            if ($client instanceof Client) {
                $this->synchronizeClient($client, $profile, $identity);
            } else {
                $client = (new Client())
                    ->setTenant($tenant)
                    ->setProfile($profile)
                    ->setFullName($this->resolveDisplayName($identity))
                    ->setPhone(null)
                    ->setEmail($identity->email)
                    ->setPreferredContactChannel('email')
                    ->setMarketingConsent(false)
                    ->setAvatarUrl($identity->avatarUrl)
                    ->setTags([]);

                $this->em->persist($client);
                $isNewClient = true;
            }

            $this->em->flush();
            $this->connection->commit();

            return new PwaGoogleClientProvisioningResult(
                user: $user,
                tenant: $tenant,
                client: $client,
                isNewClient: $isNewClient,
            );
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }
    }

    private function synchronizeProfile(Profile $profile, GoogleOAuthIdentity $identity): void
    {
        if (!$this->hasActiveStaffMembership($profile)) {
            $profile->setUserType('client');
        }

        if (trim((string) $profile->getFullName()) === '') {
            $profile->setFullName($this->resolveDisplayName($identity));
        }

        if ($identity->avatarUrl !== null && trim((string) $profile->getAvatarUrl()) === '') {
            $profile->setAvatarUrl($identity->avatarUrl);
        }

        if ($profile->getTimezone() === null || trim((string) $profile->getTimezone()) === '') {
            $profile->setTimezone(self::DEFAULT_TIMEZONE);
        }
    }

    private function hasActiveStaffMembership(Profile $profile): bool
    {
        return (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM staff_members WHERE profile_id = :profile_id AND is_active = true AND deleted_at IS NULL',
            ['profile_id' => $profile->getId()->toRfc4122()],
        ) > 0;
    }

    private function synchronizeClient(Client $client, Profile $profile, GoogleOAuthIdentity $identity): void
    {
        $client->setProfile($profile);

        if (trim($client->getFullName()) === '') {
            $client->setFullName($this->resolveDisplayName($identity));
        }

        if ($client->getEmail() === null) {
            $client->setEmail($identity->email);
        }

        if ($identity->avatarUrl !== null && trim((string) $client->getAvatarUrl()) === '') {
            $client->setAvatarUrl($identity->avatarUrl);
        }

        if ($client->getPreferredContactChannel() === null) {
            $client->setPreferredContactChannel('email');
        }
    }

    private function findActiveClientByProfile(\App\Entity\Tenant $tenant, Profile $profile): ?Client
    {
        return $this->clientRepository->createQueryBuilder('client')
            ->andWhere('client.tenant = :tenant')
            ->andWhere('client.profile = :profile')
            ->andWhere('client.deletedAt IS NULL')
            ->setParameter('tenant', $tenant)
            ->setParameter('profile', $profile)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function findActiveUnlinkedClientByEmail(\App\Entity\Tenant $tenant, string $email): ?Client
    {
        return $this->clientRepository->createQueryBuilder('client')
            ->andWhere('client.tenant = :tenant')
            ->andWhere('client.email = :email')
            ->andWhere('client.profile IS NULL')
            ->andWhere('client.deletedAt IS NULL')
            ->setParameter('tenant', $tenant)
            ->setParameter('email', $email)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function resolveDisplayName(GoogleOAuthIdentity $identity): string
    {
        $fullName = trim($identity->fullName);
        if ($fullName !== '') {
            return $fullName;
        }

        $localPart = explode('@', $identity->email, 2)[0] ?? $identity->email;
        $normalized = trim((string) preg_replace('/[^a-z0-9]+/i', ' ', $localPart));

        return $normalized !== ''
            ? mb_convert_case($normalized, \MB_CASE_TITLE, 'UTF-8')
            : 'Cliente';
    }
}
