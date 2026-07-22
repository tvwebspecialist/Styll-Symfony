<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Profile;
use App\Entity\User;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Uid\Uuid;

final class AdminAnalyticsControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;

    /**
     * @var array{tenantA: \App\Entity\Tenant, tenantB: \App\Entity\Tenant, userA: User, userB: User}
     */
    private array $seed;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $this->seed = $fixture->seedTwoTenantsWithClients();
        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testPlatformAnalyticsEndpointRejectsNormalStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', '/api/admin/analytics?days=30', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSuperadminPlatformAnalyticsAggregatesCrossTenantDailyRows(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $tenantAId = $this->seed['tenantA']->getId()->toRfc4122();
        $tenantBId = $this->seed['tenantB']->getId()->toRfc4122();
        $currentA = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->modify('-5 days')->format('Y-m-d');
        $currentB = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->modify('-1 day')->format('Y-m-d');
        $previous = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->modify('-35 days')->format('Y-m-d');

        $this->insertSiteAnalyticsRow($tenantAId, $currentA, 'website', 20, 45, 15, 8, 4, 2, 0.2000, ['mobile' => 12, 'desktop' => 8]);
        $this->insertSiteAnalyticsRow($tenantAId, $currentA, 'pwa', 5, 9, 4, 3, 1, 1, 0.2500, ['mobile' => 3, 'desktop' => 2]);
        $this->insertSiteAnalyticsRow($tenantBId, $currentB, 'website', 30, 60, 21, 10, 3, 0, 0.1000, ['mobile' => 18, 'desktop' => 12]);
        $this->insertSiteAnalyticsRow($tenantAId, $previous, 'website', 10, 18, 9, 4, 1, 0, 0.1000, ['mobile' => 6, 'desktop' => 4]);
        $this->insertTenantActivityLog($tenantAId, '-2 days');
        $this->insertTenantActivityLog($tenantBId, '-15 days');

        $this->client->request('GET', '/api/admin/analytics?days=30', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();

        self::assertSame(55, $payload['summary']['total_sessions'] ?? null);
        self::assertSame(10, $payload['summary']['prev_total_sessions'] ?? null);
        self::assertSame(33, $payload['summary']['mobile_sessions'] ?? null);
        self::assertSame(22, $payload['summary']['desktop_sessions'] ?? null);
        self::assertSame('tenant-b-api', $payload['summary']['top_tenant']['slug'] ?? null);
        self::assertCount(2, $payload['daily'] ?? []);
        self::assertSame($currentA, $payload['daily'][0]['date'] ?? null);
        self::assertSame(25, $payload['daily'][0]['sessions'] ?? null);
        self::assertCount(2, $payload['tenants'] ?? []);
        self::assertSame('tenant-b-api', $payload['tenants'][0]['slug'] ?? null);
        self::assertNotNull($payload['tenants'][0]['last_login_at'] ?? null);
    }

    public function testSuperadminTenantAnalyticsReturnsOnlyRequestedTenantData(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $tenantAId = $this->seed['tenantA']->getId()->toRfc4122();
        $tenantBId = $this->seed['tenantB']->getId()->toRfc4122();
        $current = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->modify('-3 days')->format('Y-m-d');

        $this->insertSiteAnalyticsRow($tenantAId, $current, 'website', 14, 28, 10, 4, 2, 1, 0.5000, ['mobile' => 8, 'desktop' => 6]);
        $this->insertSiteAnalyticsRow($tenantAId, $current, 'pwa', 6, 11, 5, 2, 1, 0, 0.5000, ['mobile' => 4, 'desktop' => 2]);
        $this->insertSiteAnalyticsRow($tenantBId, $current, 'website', 99, 140, 70, 40, 20, 4, 0.5000, ['mobile' => 80, 'desktop' => 19]);
        $this->insertTenantActivityLog($tenantAId, '-1 day');
        $this->insertAppointment($tenantAId, '-2 days');
        $this->insertAppointment($tenantAId, '-45 days');

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/analytics?days=30', $tenantAId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();

        self::assertSame('Tenant A API Barber', $payload['tenant_name'] ?? null);
        self::assertSame(30, $payload['period'] ?? null);
        self::assertSame(1, $payload['appointments_in_period'] ?? null);
        self::assertCount(1, $payload['website_daily'] ?? []);
        self::assertCount(1, $payload['pwa_daily'] ?? []);
        self::assertSame(14, $payload['website_daily'][0]['sessions'] ?? null);
        self::assertSame(6, $payload['pwa_daily'][0]['sessions'] ?? null);
        self::assertSame($tenantAId, $payload['website_daily'][0]['tenant_id'] ?? null);
        self::assertNotSame($tenantBId, $payload['website_daily'][0]['tenant_id'] ?? null);
        self::assertNotNull($payload['last_login_at'] ?? null);
    }

    private function insertSiteAnalyticsRow(
        string $tenantId,
        string $date,
        string $surface,
        int $sessions,
        int $pageViews,
        int $uniqueVisitors,
        int $bookingStartedCount,
        int $bookingCompletedCount,
        int $signupCount,
        float $conversionRate,
        array $deviceBreakdown,
    ): void {
        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(\DateTimeInterface::ATOM);

        $this->em->getConnection()->insert('site_analytics_daily', [
            'tenant_id' => $tenantId,
            'date' => $date,
            'app_surface' => $surface,
            'sessions' => $sessions,
            'page_views' => $pageViews,
            'unique_visitors' => $uniqueVisitors,
            'booking_started_count' => $bookingStartedCount,
            'booking_completed_count' => $bookingCompletedCount,
            'signup_count' => $signupCount,
            'conversion_rate' => $conversionRate,
            'top_referrers' => json_encode([], \JSON_THROW_ON_ERROR),
            'device_breakdown' => json_encode($deviceBreakdown, \JSON_THROW_ON_ERROR),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function insertTenantActivityLog(string $tenantId, string $lastLoginModifier): void
    {
        $recordedAt = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $lastLoginAt = $recordedAt->modify($lastLoginModifier);

        $this->em->getConnection()->insert('tenant_activity_log', [
            'id' => Uuid::v4()->toRfc4122(),
            'tenant_id' => $tenantId,
            'last_login_at' => $lastLoginAt->format(\DateTimeInterface::ATOM),
            'appointments_this_month' => 3,
            'active_clients_count' => 12,
            'total_revenue_this_month' => 149.90,
            'recorded_at' => $recordedAt->format(\DateTimeInterface::ATOM),
            'created_at' => $recordedAt->format(\DateTimeInterface::ATOM),
        ]);
    }

    private function insertAppointment(string $tenantId, string $createdAtModifier): void
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $createdAt = $now->modify($createdAtModifier);
        $locationId = Uuid::v4()->toRfc4122();
        $clientId = (string) $this->em->getConnection()->fetchOne(
            'SELECT id FROM clients WHERE tenant_id = :tenant_id AND deleted_at IS NULL LIMIT 1',
            ['tenant_id' => $tenantId],
        );
        $staffId = (string) $this->em->getConnection()->fetchOne(
            'SELECT id FROM staff_members WHERE tenant_id = :tenant_id AND deleted_at IS NULL LIMIT 1',
            ['tenant_id' => $tenantId],
        );

        $this->em->getConnection()->insert('locations', [
            'id' => $locationId,
            'tenant_id' => $tenantId,
            'name' => 'Analytics Test Location '.substr($locationId, 0, 8),
            'timezone' => 'Europe/Rome',
            'is_active' => 1,
            'show_on_website' => 0,
            'created_at' => $createdAt->format(\DateTimeInterface::ATOM),
            'updated_at' => $createdAt->format(\DateTimeInterface::ATOM),
        ]);

        $this->em->getConnection()->insert('appointments', [
            'id' => Uuid::v4()->toRfc4122(),
            'tenant_id' => $tenantId,
            'client_id' => $clientId,
            'staff_id' => $staffId,
            'location_id' => $locationId,
            'start_time' => $createdAt->modify('+1 day')->format(\DateTimeInterface::ATOM),
            'end_time' => $createdAt->modify('+1 day +30 minutes')->format(\DateTimeInterface::ATOM),
            'status' => 'confirmed',
            'booking_source' => 'pwa',
            'payment_status' => 'unpaid',
            'version' => 1,
            'created_at' => $createdAt->format(\DateTimeInterface::ATOM),
            'updated_at' => $createdAt->format(\DateTimeInterface::ATOM),
        ]);
    }

    private function promoteToSuperadmin(User $user): void
    {
        $managedUser = $this->em->getRepository(User::class)->find($user->getId());
        self::assertInstanceOf(User::class, $managedUser);

        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        self::assertInstanceOf(Profile::class, $profile);

        $managedUser->setRoles(['ROLE_STAFF', 'ROLE_SUPERADMIN']);
        $profile->setIsSuperadmin(true);
        $profile->setEmail($managedUser->getEmail());

        $this->em->flush();
        $this->em->clear();
    }

    private function login(string $email): string
    {
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => $email,
            'password' => TestTenantFixture::PASSWORD,
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertIsString($payload['token'] ?? null);

        return $payload['token'];
    }

    /**
     * @return array<string, mixed>|list<mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }
}
