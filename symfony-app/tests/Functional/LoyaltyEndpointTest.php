<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Fase 1c — Loyalty read-only.
 *
 * Tests:
 *  - GET /api/loyalty-config (active config per tenant)
 *  - GET /api/rewards (active rewards catalog per tenant)
 *  - GET /api/clients/{id}/loyalty (state per client; 404 if not enrolled)
 *  - GET /api/clients/{id}/loyalty-transactions (paginated)
 *  - GET /api/clients/{id}/reward-redemptions (paginated)
 *
 * Tenant A: full loyalty setup (config, rewards, enrolled client).
 * Tenant B: no loyalty data — used to verify 404 and cross-tenant isolation.
 */
final class LoyaltyEndpointTest extends WebTestCase
{
    private KernelBrowser $browser;
    private array $seed;

    protected function setUp(): void
    {
        $this->browser = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $this->seed = $fixture->seedTwoTenantsWithLoyaltyData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── GET /api/loyalty-config ───────────────────────────────────────────────

    public function testGetLoyaltyConfigRequiresAuth(): void
    {
        $this->browser->request('GET', '/api/loyalty-config');
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetLoyaltyConfigReturnsTenantAConfig(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $configId = (string) $this->seed['loyaltyConfigA']->getId();

        $this->browser->request('GET', '/api/loyalty-config', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame($configId, $data['id']);
        self::assertSame('classic', $data['template']);
        self::assertTrue($data['isActive']);
        self::assertSame(100, $data['pointsPerVisit']);
        self::assertSame(45, $data['streakThresholdDays']);
        self::assertSame(1, $data['version']);
        self::assertArrayHasKey('startedAt', $data);
    }

    public function testGetLoyaltyConfigReturns404ForTenantWithNoConfig(): void
    {
        // Tenant B has no loyalty config seeded → 404
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->browser->request('GET', '/api/loyalty-config', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testGetLoyaltyConfigTenantIsolation(): void
    {
        // Tenant A gets their own config; Tenant B (no config) gets 404.
        // This proves the Doctrine TenantFilter scopes the query correctly.
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $configAId = (string) $this->seed['loyaltyConfigA']->getId();

        $this->browser->request('GET', '/api/loyalty-config', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
        ]);
        self::assertResponseIsSuccessful();
        self::assertSame($configAId, $this->json()['id']);

        // Tenant B sees 404, not tenant A's config
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $this->browser->request('GET', '/api/loyalty-config', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
        ]);
        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/rewards ─────────────────────────────────────────────────────

    public function testGetRewardsRequiresAuth(): void
    {
        $this->browser->request('GET', '/api/rewards');
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetRewardsReturnsTenantActiveRewards(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->request('GET', '/api/rewards', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $rewards = $this->json();
        self::assertIsArray($rewards);
        self::assertCount(2, $rewards, 'Tenant A has 2 active rewards.');

        // Check shape of first reward
        $first = $rewards[0];
        self::assertArrayHasKey('id', $first);
        self::assertArrayHasKey('name', $first);
        self::assertArrayHasKey('pointsCost', $first);
        self::assertArrayHasKey('rewardType', $first);
        self::assertArrayHasKey('displayOrder', $first);
        self::assertTrue($first['isActive']);

        // Ordered by displayOrder ASC
        self::assertSame($rewards[0]['displayOrder'], 1);
        self::assertSame($rewards[1]['displayOrder'], 2);
    }

    public function testGetRewardsTenantIsolation(): void
    {
        // Tenant B has no rewards → empty array (not tenant A's rewards)
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->browser->request('GET', '/api/rewards', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame([], $this->json());
    }

    // ─── GET /api/clients/{id}/loyalty ────────────────────────────────────────

    public function testGetClientLoyaltyRequiresAuth(): void
    {
        $clientId = (string) $this->seed['clientA']->getId();
        $this->browser->request('GET', "/api/clients/$clientId/loyalty");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetClientLoyaltyReturnsEnrolledClientState(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();

        $this->browser->request('GET', "/api/clients/$clientId/loyalty", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame($clientId, $data['clientId']);
        self::assertSame(200, $data['totalPoints']);
        self::assertSame(150, $data['availablePoints']);
        self::assertSame(3, $data['currentStreak']);
        self::assertSame(3, $data['longestStreak']);
        self::assertSame('bronze', $data['currentTier']);
        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('updatedAt', $data);
    }

    public function testGetClientLoyaltyReturns404ForUnenrolledClient(): void
    {
        // clientAUnenrolled belongs to tenant A but has no ClientLoyalty record
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientAUnenrolled']->getId();

        $this->browser->request('GET', "/api/clients/$clientId/loyalty", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testGetClientLoyaltyReturns404ForCrossTenantClient(): void
    {
        // Tenant A tries to access a client from Tenant B → 404, no data leak
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientBId = (string) $this->seed['clientBCross']->getId();

        $this->browser->request('GET', "/api/clients/$clientBId/loyalty", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/clients/{id}/loyalty-transactions ───────────────────────────

    public function testGetClientLoyaltyTransactionsRequiresAuth(): void
    {
        $clientId = (string) $this->seed['clientA']->getId();
        $this->browser->request('GET', "/api/clients/$clientId/loyalty-transactions");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetClientLoyaltyTransactionsReturnsPaginated(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();

        $this->browser->request('GET', "/api/clients/$clientId/loyalty-transactions", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertArrayHasKey('items', $data);
        self::assertArrayHasKey('total', $data);
        self::assertArrayHasKey('page', $data);
        self::assertArrayHasKey('limit', $data);
        self::assertSame(1, $data['total'], 'One earn transaction seeded for clientA.');
        self::assertCount(1, $data['items']);

        $tx = $data['items'][0];
        self::assertSame('earn', $tx['type']);
        self::assertSame(200, $tx['points']);
        self::assertArrayHasKey('id', $tx);
        self::assertArrayHasKey('createdAt', $tx);
    }

    public function testGetClientLoyaltyTransactionsReturns404ForCrossTenantClient(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientBId = (string) $this->seed['clientBCross']->getId();

        $this->browser->request('GET', "/api/clients/$clientBId/loyalty-transactions", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/clients/{id}/reward-redemptions ─────────────────────────────

    public function testGetClientRewardRedemptionsRequiresAuth(): void
    {
        $clientId = (string) $this->seed['clientA']->getId();
        $this->browser->request('GET', "/api/clients/$clientId/reward-redemptions");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetClientRewardRedemptionsReturnsForClient(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();

        $this->browser->request('GET', "/api/clients/$clientId/reward-redemptions", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertArrayHasKey('items', $data);
        self::assertSame(1, $data['total'], 'One redemption seeded for clientA.');
        self::assertCount(1, $data['items']);

        $r = $data['items'][0];
        self::assertSame(50, $r['pointsSpent']);
        self::assertArrayHasKey('rewardName', $r);
        self::assertArrayHasKey('rewardId', $r);
        self::assertArrayHasKey('confirmedAt', $r);
        self::assertArrayHasKey('createdAt', $r);
        self::assertNotNull($r['confirmedAt'], 'Redemption is confirmed.');
    }

    public function testGetClientRewardRedemptionsReturns404ForCrossTenantClient(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientBId = (string) $this->seed['clientBCross']->getId();

        $this->browser->request('GET', "/api/clients/$clientBId/reward-redemptions", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function login(string $email): string
    {
        $this->browser->jsonRequest('POST', '/api/login', [
            'email'    => $email,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseIsSuccessful();
        $payload = $this->json();
        self::assertArrayHasKey('token', $payload);

        return (string) $payload['token'];
    }

    /** @return array<mixed> */
    private function json(): array
    {
        $content = $this->browser->getResponse()->getContent();
        $decoded = json_decode((string) $content, true, 512, \JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);

        return $decoded;
    }
}
