<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Entity\Client;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class TestTenantFixture
{
    public const PASSWORD = 'styll-test-password-only';
    public const TENANT_A_EMAIL = 'tenant-a.api@example.test';
    public const TENANT_B_EMAIL = 'tenant-b.api@example.test';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

    /**
     * @return array{tenantA: Tenant, tenantB: Tenant, userA: User, userB: User}
     */
    public function seedTwoTenantsWithClients(): array
    {
        $tenantA = $this->seedTenant(
            businessName: 'Tenant A API Barber',
            slug: 'tenant-a-api',
            staffEmail: self::TENANT_A_EMAIL,
            staffName: 'Tenant A API Staff',
            clientPrefix: 'Tenant A API',
            phonePrefix: '+391001',
        );

        $tenantB = $this->seedTenant(
            businessName: 'Tenant B API Barber',
            slug: 'tenant-b-api',
            staffEmail: self::TENANT_B_EMAIL,
            staffName: 'Tenant B API Staff',
            clientPrefix: 'Tenant B API',
            phonePrefix: '+391002',
        );

        $this->em->flush();

        return [
            'tenantA' => $tenantA['tenant'],
            'tenantB' => $tenantB['tenant'],
            'userA' => $tenantA['user'],
            'userB' => $tenantB['user'],
        ];
    }

    public function resetDatabase(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }

        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
        $this->em->clear();
    }

    /**
     * @return array{tenant: Tenant, user: User}
     */
    private function seedTenant(
        string $businessName,
        string $slug,
        string $staffEmail,
        string $staffName,
        string $clientPrefix,
        string $phonePrefix,
    ): array {
        $tenant = (new Tenant())
            ->setBusinessName($businessName)
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setRoles(['ROLE_STAFF']);
        $user->setPassword($this->passwordHasher->hashPassword($user, self::PASSWORD));

        $profile = (new Profile($user))
            ->setFullName($staffName);

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $clientOne = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 1')
            ->setPhone($phonePrefix.'1');

        $clientTwo = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 2')
            ->setPhone($phonePrefix.'2');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($clientOne);
        $this->em->persist($clientTwo);

        return ['tenant' => $tenant, 'user' => $user];
    }
}
