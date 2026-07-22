<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Location;
use App\Entity\LegalAcceptanceEvent;
use App\Entity\Profile;
use App\Entity\Service;
use App\Entity\StaffMember;
use App\Entity\StaffService;
use App\Entity\Tenant;
use App\Entity\User;
use App\Entity\WorkingHour;
use App\Exception\StaffRegistrationConflictException;
use App\Repository\ProfileRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\TenantRepository;
use App\Repository\UserRepository;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class StaffRegistrationService
{
    private const DEFAULT_TIMEZONE = 'Europe/Rome';
    private const DEFAULT_WORK_MODE = 'solo';
    private const DEFAULT_START_TIME = '09:00';
    private const DEFAULT_END_TIME = '19:00';
    private const MAX_SLUG_LENGTH = 30;
    private const B2B_TERMS_VERSION = '1.3';
    private const B2B_PRIVACY_VERSION = '1.5';
    private const RESERVED_SLUGS = [
        'www',
        'admin',
        'app',
        'dashboard',
        'api',
        'status',
        'mail',
        'smtp',
        'ftp',
        'styll',
        'billing',
        'login',
        'signup',
        'auth',
        'help',
        'support',
        'blog',
        'docs',
    ];
    private const SERVICE_PRESETS = [
        'barbiere' => [
            ['name' => 'Taglio classico', 'price' => 15, 'duration' => 30],
            ['name' => 'Taglio + Barba', 'price' => 22, 'duration' => 45],
            ['name' => 'Rifinitura barba', 'price' => 10, 'duration' => 20],
            ['name' => 'Shave completo', 'price' => 18, 'duration' => 30],
        ],
        'parrucchiere' => [
            ['name' => 'Taglio', 'price' => 25, 'duration' => 45],
            ['name' => 'Piega', 'price' => 20, 'duration' => 30],
            ['name' => 'Colore', 'price' => 60, 'duration' => 90],
        ],
        'salone_misto' => [
            ['name' => 'Taglio uomo', 'price' => 18, 'duration' => 30],
            ['name' => 'Taglio donna', 'price' => 25, 'duration' => 45],
            ['name' => 'Barba', 'price' => 12, 'duration' => 20],
        ],
        'beauty_center' => [
            ['name' => 'Trattamento viso', 'price' => 35, 'duration' => 45],
            ['name' => 'Manicure', 'price' => 25, 'duration' => 40],
            ['name' => 'Massaggio', 'price' => 50, 'duration' => 60],
        ],
        'altro' => [
            ['name' => 'Servizio 1', 'price' => 20, 'duration' => 30],
            ['name' => 'Servizio 2', 'price' => 30, 'duration' => 45],
        ],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Connection $connection,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly UserRepository $userRepository,
        private readonly TenantRepository $tenantRepository,
        private readonly ProfileRepository $profileRepository,
        private readonly StaffMemberRepository $staffMemberRepository,
    ) {}

    public function register(StaffRegistrationInput $input): StaffRegistrationResult
    {
        $email = mb_strtolower(trim($input->email));
        if ($this->userRepository->findOneBy(['email' => $email]) instanceof User) {
            throw new StaffRegistrationConflictException(
                sprintf('A user with email "%s" already exists.', $email),
                StaffRegistrationConflictException::EMAIL_ALREADY_USED,
            );
        }

        $businessName = trim($input->businessName);
        $businessType = $this->normalizeBusinessType($input->businessType);
        $tenantSlug = $this->generateUniqueTenantSlug($businessName);
        $fullName = $this->normalizeFullName($input->fullName, $businessName, $email);

        $this->connection->beginTransaction();

        try {
            $user = $this->buildUser($email, $input->password, ['ROLE_STAFF']);
            $profile = $this->configureStaffProfile(
                profile: new Profile($user),
                fullName: $fullName,
                avatarUrl: $input->avatarUrl,
                forceFullName: true,
            );

            $this->em->persist($user);
            $this->em->persist($profile);

            $result = $this->bootstrapOwnerTenant(
                user: $user,
                profile: $profile,
                businessName: $businessName,
                businessType: $businessType,
                tenantSlug: $tenantSlug,
                legalAcceptanceSource: $input->legalAcceptanceSource,
                registrationSource: $input->registrationSource,
            );

            $this->connection->commit();

            return $result;
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }
    }

    public function registerGoogleStaff(GoogleStaffProvisioningInput $input): StaffRegistrationResult
    {
        $email = mb_strtolower(trim($input->email));
        $businessName = trim($input->businessName);
        $businessType = $this->normalizeBusinessType($input->businessType);
        $tenantSlug = $this->generateUniqueTenantSlug($businessName);
        $fullName = $this->normalizeFullName($input->fullName, $businessName, $email);

        $this->connection->beginTransaction();

        try {
            $user = $this->userRepository->findOneBy(['email' => $email]);
            if (!$user instanceof User) {
                $user = $this->buildUser(
                    email: $email,
                    password: bin2hex(random_bytes(32)),
                    roles: ['ROLE_STAFF'],
                );
                $this->em->persist($user);
            } else {
                $user->setRoles($this->mergeRoles($user->getRoles(), ['ROLE_STAFF']));
            }

            $profile = $this->profileRepository->find($user->getId());
            if (!$profile instanceof Profile) {
                $profile = new Profile($user);
                $this->em->persist($profile);
            }

            $this->configureStaffProfile(
                profile: $profile,
                fullName: $fullName,
                avatarUrl: $input->avatarUrl,
                forceFullName: trim((string) $input->fullName) !== '',
            );

            $existingMembership = $this->findFirstActiveStaffMembership($profile);
            if ($existingMembership instanceof StaffMember) {
                $this->em->flush();
                $this->connection->commit();

                return new StaffRegistrationResult($user, $existingMembership->getTenant(), $existingMembership);
            }

            $result = $this->bootstrapOwnerTenant(
                user: $user,
                profile: $profile,
                businessName: $businessName,
                businessType: $businessType,
                tenantSlug: $tenantSlug,
                legalAcceptanceSource: LegalAcceptanceEvent::SOURCE_GOOGLE_OAUTH_REGISTER,
                registrationSource: 'google_oauth_symfony',
            );

            $this->connection->commit();

            return $result;
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }
    }

    private function normalizeBusinessType(?string $businessType): string
    {
        $candidate = trim((string) $businessType);

        return array_key_exists($candidate, self::SERVICE_PRESETS)
            ? $candidate
            : 'barbiere';
    }

    private function normalizeFullName(?string $fullName, string $businessName, string $email): string
    {
        $candidate = trim((string) $fullName);
        if ($candidate !== '') {
            return $candidate;
        }

        $businessCandidate = trim($businessName);
        if ($businessCandidate !== '') {
            return $businessCandidate;
        }

        $localPart = explode('@', $email, 2)[0] ?? $email;
        $label = preg_replace('/[^a-z0-9]+/i', ' ', $localPart);
        $normalized = trim((string) $label);

        return $normalized !== ''
            ? mb_convert_case($normalized, \MB_CASE_TITLE, 'UTF-8')
            : 'Staff Owner';
    }

    private function buildUser(string $email, string $password, array $roles): User
    {
        $user = (new User())
            ->setEmail($email)
            ->setRoles($roles);

        $user->setPassword($this->passwordHasher->hashPassword($user, $password));

        return $user;
    }

    private function configureStaffProfile(
        Profile $profile,
        string $fullName,
        ?string $avatarUrl,
        bool $forceFullName,
    ): Profile {
        $currentFullName = trim((string) $profile->getFullName());
        if ($forceFullName || $currentFullName === '') {
            $profile->setFullName($fullName);
        }

        $currentAvatarUrl = trim((string) $profile->getAvatarUrl());
        if ($avatarUrl !== null && trim($avatarUrl) !== '' && $currentAvatarUrl === '') {
            $profile->setAvatarUrl(trim($avatarUrl));
        }

        return $profile
            ->setUserType('staff')
            ->setTimezone(self::DEFAULT_TIMEZONE)
            ->setOnboardingCompleted(true)
            ->setWorkMode(self::DEFAULT_WORK_MODE);
    }

    private function bootstrapOwnerTenant(
        User $user,
        Profile $profile,
        string $businessName,
        string $businessType,
        string $tenantSlug,
        string $legalAcceptanceSource,
        string $registrationSource,
    ): StaffRegistrationResult {
        $tenant = (new Tenant())
            ->setBusinessName($businessName)
            ->setSlug($tenantSlug)
            ->setTimezone(self::DEFAULT_TIMEZONE)
            ->setStatus('active')
            ->setSettings([
                'business_type' => $businessType,
                'registration_source' => $registrationSource,
            ]);

        $staffMember = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner')
            ->setShowOnWebsite(false);

        $location = (new Location())
            ->setTenant($tenant)
            ->setName($businessName)
            ->setTimezone(self::DEFAULT_TIMEZONE)
            ->setIsActive(true)
            ->setShowOnWebsite(true);

        $this->em->persist($tenant);
        $this->em->persist($staffMember);
        $this->em->persist($location);

        if ($this->shouldPersistLegalAcceptanceEvent($user)) {
            $this->em->persist(
                (new LegalAcceptanceEvent())
                    ->setUser($user)
                    ->setProfile($profile)
                    ->setTenant($tenant)
                    ->setDocumentType(LegalAcceptanceEvent::DOCUMENT_TYPE_B2B_TERMS)
                    ->setDocumentVersion(self::B2B_TERMS_VERSION)
                    ->setPrivacyNoticeVersion(self::B2B_PRIVACY_VERSION)
                    ->setAcceptedBy($profile)
                    ->setSource($legalAcceptanceSource)
                    ->setMetadata([
                        'flow' => $registrationSource,
                    ]),
            );
        }

        foreach ($this->buildDefaultServices($businessType) as $index => $preset) {
            $service = (new Service())
                ->setTenant($tenant)
                ->setName($preset['name'])
                ->setPrice(number_format((float) $preset['price'], 2, '.', ''))
                ->setDurationMinutes((int) $preset['duration'])
                ->setDisplayOrder($index)
                ->setShowOnWebsite(true)
                ->setIsActive(true)
                ->setCreatedBy($profile);

            $staffService = (new StaffService())
                ->setTenant($tenant)
                ->setStaff($staffMember)
                ->setService($service);

            $this->em->persist($service);
            $this->em->persist($staffService);
        }

        foreach ([1, 2, 3, 4, 5, 6] as $dayOfWeek) {
            $workingHour = (new WorkingHour())
                ->setTenant($tenant)
                ->setStaff($staffMember)
                ->setLocation($location)
                ->setDayOfWeek($dayOfWeek)
                ->setStartTime($this->createTime(self::DEFAULT_START_TIME))
                ->setEndTime($this->createTime(self::DEFAULT_END_TIME));

            $this->em->persist($workingHour);
        }

        $this->em->flush();

        $this->connection->insert('staff_locations', [
            'tenant_id' => $tenant->getId()->toRfc4122(),
            'staff_id' => $staffMember->getId()->toRfc4122(),
            'location_id' => $location->getId()->toRfc4122(),
        ]);

        return new StaffRegistrationResult($user, $tenant, $staffMember);
    }

    private function generateUniqueTenantSlug(string $businessName): string
    {
        $base = $this->buildBaseSlug($businessName);
        $candidate = $base;
        $suffix = 2;

        while ($this->tenantRepository->findOneBy(['slug' => $candidate]) instanceof Tenant) {
            $candidate = $this->appendSlugSuffix($base, $suffix);
            ++$suffix;
        }

        return $candidate;
    }

    private function buildBaseSlug(string $businessName): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $businessName);
        $normalized = mb_strtolower($ascii !== false ? $ascii : $businessName);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
        $slug = trim($slug, '-');
        $slug = preg_replace('/-{2,}/', '-', $slug) ?? '';
        $slug = $this->trimSlug($slug !== '' ? $slug : 'studio');

        if ($slug === '' || in_array($slug, self::RESERVED_SLUGS, true) || str_ends_with($slug, '-app') || str_ends_with($slug, '-dashboard')) {
            $slug = $this->appendSlugSuffix($slug !== '' ? $slug : 'studio', 'studio');
        }

        return $slug;
    }

    private function appendSlugSuffix(string $base, int|string $suffix): string
    {
        $suffixString = is_int($suffix) ? (string) $suffix : trim((string) $suffix);
        $availableBaseLength = self::MAX_SLUG_LENGTH - mb_strlen($suffixString) - 1;
        $trimmedBase = $this->trimSlug(mb_substr($base, 0, max(1, $availableBaseLength)));

        return sprintf('%s-%s', $trimmedBase !== '' ? $trimmedBase : 'studio', $suffixString);
    }

    private function trimSlug(string $slug): string
    {
        $trimmed = trim(mb_substr($slug, 0, self::MAX_SLUG_LENGTH), '-');

        return preg_replace('/-{2,}/', '-', $trimmed) ?? '';
    }

    /**
     * @return list<array{name: string, price: int|float, duration: int}>
     */
    private function buildDefaultServices(string $businessType): array
    {
        return self::SERVICE_PRESETS[$businessType] ?? self::SERVICE_PRESETS['barbiere'];
    }

    private function createTime(string $time): \DateTimeImmutable
    {
        $parsed = \DateTimeImmutable::createFromFormat('!H:i', $time);

        if (!$parsed instanceof \DateTimeImmutable) {
            throw new \RuntimeException(sprintf('Invalid default time "%s".', $time));
        }

        return $parsed;
    }

    private function findFirstActiveStaffMembership(Profile $profile): ?StaffMember
    {
        $queryBuilder = $this->staffMemberRepository->createQueryBuilder('staff_member');

        return $queryBuilder
            ->andWhere('staff_member.profile = :profile')
            ->andWhere('staff_member.isActive = true')
            ->andWhere('staff_member.deletedAt IS NULL')
            ->setParameter('profile', $profile)
            ->orderBy('staff_member.createdAt', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function shouldPersistLegalAcceptanceEvent(User $user): bool
    {
        $count = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM legal_acceptance_events WHERE user_id = :user_id AND document_type = :document_type AND document_version = :document_version',
            [
                'user_id' => $user->getId()->toRfc4122(),
                'document_type' => LegalAcceptanceEvent::DOCUMENT_TYPE_B2B_TERMS,
                'document_version' => self::B2B_TERMS_VERSION,
            ],
        );

        return $count === 0;
    }

    /**
     * @param list<string> $existingRoles
     * @param list<string> $rolesToAdd
     *
     * @return list<string>
     */
    private function mergeRoles(array $existingRoles, array $rolesToAdd): array
    {
        return array_values(array_unique(array_merge($existingRoles, $rolesToAdd)));
    }
}
