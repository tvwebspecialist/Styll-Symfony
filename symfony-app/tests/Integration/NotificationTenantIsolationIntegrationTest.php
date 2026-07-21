<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Notification;
use App\Entity\NotificationLog;
use App\Entity\Profile;
use App\Entity\PushSubscription;
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

final class NotificationTenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnNotificationsLogsAndPushSubscriptions(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.notifications@example.test');

        self::assertSame(['Tenant A notification'], $this->notificationTitles());
        self::assertSame(['tenant-a-reminder'], $this->notificationLogTypes());
        self::assertSame(['https://push.example.test/a'], $this->pushEndpoints());
    }

    public function testTenantBSeesOnlyOwnNotificationsLogsAndPushSubscriptions(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.notifications@example.test');

        self::assertSame(['Tenant B notification'], $this->notificationTitles());
        self::assertSame(['tenant-b-reminder'], $this->notificationLogTypes());
        self::assertSame(['https://push.example.test/b'], $this->pushEndpoints());
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
            Request::create('/api/test-notification-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function notificationTitles(): array
    {
        $notifications = $this->em->getRepository(Notification::class)->findBy([], ['title' => 'ASC']);

        return array_map(static fn (Notification $notification): string => $notification->getTitle(), $notifications);
    }

    /**
     * @return list<string>
     */
    private function notificationLogTypes(): array
    {
        $logs = $this->em->getRepository(NotificationLog::class)->findBy([], ['type' => 'ASC']);

        return array_map(static fn (NotificationLog $log): string => $log->getType(), $logs);
    }

    /**
     * @return list<string>
     */
    private function pushEndpoints(): array
    {
        $subscriptions = $this->em->getRepository(PushSubscription::class)->findBy([], ['endpoint' => 'ASC']);

        return array_map(static fn (PushSubscription $subscription): string => $subscription->getEndpoint(), $subscriptions);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-notifications', 'tenant-a.notifications@example.test', 'https://push.example.test/a', 'tenant-a-reminder');
        $this->seedTenant('Tenant B', 'tenant-b-notifications', 'tenant-b.notifications@example.test', 'https://push.example.test/b', 'tenant-b-reminder');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $endpoint, string $logType): void
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-2-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $notification = (new Notification())
            ->setTenant($tenant)
            ->setProfile(null)
            ->setType(Notification::TYPE_LOW_STOCK)
            ->setTitle($label.' notification')
            ->setBody('Low stock alert')
            ->setMeta(['label' => $label]);

        $notificationLog = (new NotificationLog())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setType($logType);

        $pushSubscription = (new PushSubscription())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setEndpoint($endpoint)
            ->setP256dhKey('p256dh-'.$slug)
            ->setAuthKey('auth-'.$slug)
            ->setDeviceLabel($label.' Device');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($notification);
        $this->em->persist($notificationLog);
        $this->em->persist($pushSubscription);
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
