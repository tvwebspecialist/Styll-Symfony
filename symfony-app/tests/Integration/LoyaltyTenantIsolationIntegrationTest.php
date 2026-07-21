<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\EventListener\TenantFilterSubscriber;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

final class LoyaltyTenantIsolationIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private TokenStorageInterface $tokenStorage;
    private TenantContext $tenantContext;
    private string $tenantALoyaltyId;

    protected function setUp(): void
    {
        self::bootKernel();

        $container = self::getContainer();
        $this->em = $container->get(EntityManagerInterface::class);
        $this->tokenStorage = $container->get(TokenStorageInterface::class);
        $this->tenantContext = $container->get(TenantContext::class);

        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        $this->resetDatabase();
        $this->seedTwoTenants();
        $this->em->clear();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        parent::tearDown();
    }

    public function testTenantBCannotSeeOrChangeTenantAClientLoyaltyPoints(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.loyalty@example.test');

        $loyaltyRepository = $this->em->getRepository(ClientLoyalty::class);
        $tenantBLoyaltyRows = $loyaltyRepository->findBy([], ['availablePoints' => 'DESC']);

        self::assertCount(1, $tenantBLoyaltyRows);
        self::assertSame(90, $tenantBLoyaltyRows[0]->getAvailablePoints());
        self::assertSame('Tenant B - Loyalty Client', $tenantBLoyaltyRows[0]->getClient()->getFullName());

        $foreignLoyaltyRow = $loyaltyRepository->find($this->tenantALoyaltyId);
        self::assertNull($foreignLoyaltyRow);

        $this->disableTenantFilter();
        $this->em->clear();

        $tenantALoyaltyRow = $this->em->getRepository(ClientLoyalty::class)->find($this->tenantALoyaltyId);
        self::assertInstanceOf(ClientLoyalty::class, $tenantALoyaltyRow);
        self::assertSame(140, $tenantALoyaltyRow->getAvailablePoints());
        self::assertSame(240, $tenantALoyaltyRow->getTotalPoints());
    }

    private function authenticateAndEnableFilter(string $email): void
    {
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        self::assertInstanceOf(User::class, $user);

        $this->tokenStorage->setToken(new UsernamePasswordToken($user, 'api', $user->getRoles()));
        $this->tenantContext->reset();
        $this->enableFilterForCurrentRequest();
    }

    private function enableFilterForCurrentRequest(): void
    {
        $subscriber = self::getContainer()->get(TenantFilterSubscriber::class);
        self::assertInstanceOf(TenantFilterSubscriber::class, $subscriber);

        $subscriber(new RequestEvent(
            self::$kernel,
            Request::create('/api/test-loyalty-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant(
            businessName: 'Tenant A Loyalty',
            slug: 'tenant-a-loyalty',
            staffEmail: 'tenant-a.loyalty@example.test',
            staffName: 'Tenant A Loyalty Staff',
            clientName: 'Tenant A - Loyalty Client',
            phone: '+3903010001',
            totalPoints: 240,
            availablePoints: 140,
        );

        $this->seedTenant(
            businessName: 'Tenant B Loyalty',
            slug: 'tenant-b-loyalty',
            staffEmail: 'tenant-b.loyalty@example.test',
            staffName: 'Tenant B Loyalty Staff',
            clientName: 'Tenant B - Loyalty Client',
            phone: '+3903020001',
            totalPoints: 90,
            availablePoints: 90,
        );

        $this->em->flush();
    }

    private function seedTenant(
        string $businessName,
        string $slug,
        string $staffEmail,
        string $staffName,
        string $clientName,
        string $phone,
        int $totalPoints,
        int $availablePoints,
    ): void {
        $tenant = (new Tenant())
            ->setBusinessName($businessName)
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-1-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($staffName);

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $client = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientName)
            ->setPhone($phone);

        $clientLoyalty = (new ClientLoyalty())
            ->setTenant($tenant)
            ->setClient($client)
            ->setTotalPoints($totalPoints)
            ->setAvailablePoints($availablePoints)
            ->setCurrentStreak(2)
            ->setLongestStreak(4)
            ->setCurrentTier('silver')
            ->setTierSlug('silver')
            ->setTierPointsThisYear($totalPoints)
            ->setLastVisitDate(new \DateTimeImmutable('2026-07-18'));

        if ($slug === 'tenant-a-loyalty') {
            $this->tenantALoyaltyId = $clientLoyalty->getId()->toRfc4122();
        }

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($client);
        $this->em->persist($clientLoyalty);
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
    }

    private function disableTenantFilter(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }
    }
}
