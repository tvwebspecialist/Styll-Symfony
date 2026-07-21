<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\PlatformLead;
use App\Entity\PlatformNotification;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\TenantUsageCounter;
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

final class PlatformMeteringTenantFilterIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private TokenStorageInterface $tokenStorage;
    private TenantContext $tenantContext;

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
        $this->seedData();
        $this->em->clear();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        parent::tearDown();
    }

    public function testPlatformGlobalsAreNotFilteredButTenantUsageCountersAre(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.platform@example.test');

        self::assertSame(['Tenant A created', 'Tenant B created'], $this->platformNotificationTitles());
        self::assertSame(['lead-a@example.test', 'lead-b@example.test'], $this->platformLeadEmails());
        self::assertSame(['sms_sent:10'], $this->tenantUsageCounters());
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
            Request::create('/api/test-platform-metering-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function platformNotificationTitles(): array
    {
        $notifications = $this->em->getRepository(PlatformNotification::class)->findBy([], ['title' => 'ASC']);

        return array_map(static fn (PlatformNotification $notification): string => $notification->getTitle(), $notifications);
    }

    /**
     * @return list<string>
     */
    private function platformLeadEmails(): array
    {
        $leads = $this->em->getRepository(PlatformLead::class)->findBy([], ['email' => 'ASC']);

        return array_map(static fn (PlatformLead $lead): string => $lead->getEmail(), $leads);
    }

    /**
     * @return list<string>
     */
    private function tenantUsageCounters(): array
    {
        $counters = $this->em->getRepository(TenantUsageCounter::class)->findBy([], ['metric' => 'ASC']);

        return array_map(static fn (TenantUsageCounter $counter): string => $counter->getMetric().':'.$counter->getCount(), $counters);
    }

    private function seedData(): void
    {
        $tenantA = $this->seedTenant('Tenant A', 'tenant-a-platform', 'tenant-a.platform@example.test');
        $tenantB = $this->seedTenant('Tenant B', 'tenant-b-platform', 'tenant-b.platform@example.test');

        $this->em->persist((new PlatformNotification())
            ->setTenant($tenantA)
            ->setType(PlatformNotification::TYPE_TENANT_CREATED)
            ->setTitle('Tenant A created'));

        $this->em->persist((new PlatformNotification())
            ->setTenant($tenantB)
            ->setType(PlatformNotification::TYPE_TENANT_CREATED)
            ->setTitle('Tenant B created'));

        $this->em->persist((new PlatformLead())
            ->setEmail('lead-a@example.test')
            ->setBusinessName('Lead A')
            ->setConvertedTenant($tenantA));

        $this->em->persist((new PlatformLead())
            ->setEmail('lead-b@example.test')
            ->setBusinessName('Lead B')
            ->setConvertedTenant($tenantB));

        $this->em->persist((new TenantUsageCounter())
            ->setTenant($tenantA)
            ->setMetric(TenantUsageCounter::METRIC_SMS_SENT)
            ->setCount('10')
            ->setCostCents('120'));

        $this->em->persist((new TenantUsageCounter())
            ->setTenant($tenantB)
            ->setMetric(TenantUsageCounter::METRIC_SMS_SENT)
            ->setCount('20')
            ->setCostCents('240'));

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail): Tenant
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-4-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);

        return $tenant;
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE platform_notifications, platform_leads, tenant_usage_counters, users, tenants RESTART IDENTITY CASCADE',
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
