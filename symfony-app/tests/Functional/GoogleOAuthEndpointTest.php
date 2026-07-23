<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Client;
use App\Entity\Profile;
use App\Entity\Tenant;
use App\Entity\User;
use App\Security\TenantContext;
use App\Service\GoogleOAuthIdentity;
use App\Service\LeagueGoogleOAuthProvider;
use App\Tests\Support\FakeGoogleOAuthProvider;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class GoogleOAuthEndpointTest extends WebTestCase
{
    private const CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';

    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);
        $fixture->resetDatabase();

        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
        LeagueGoogleOAuthProvider::setTestOverride(new FakeGoogleOAuthProvider([
            'staff-register-code' => new GoogleOAuthIdentity(
                email: 'owner.google.register@example.test',
                googleId: 'google-staff-register-id',
                fullName: 'Marco Google',
                avatarUrl: 'https://cdn.example.test/google/marco.jpg',
                idToken: 'google-id-token-staff-register',
                accessToken: 'google-access-token-staff-register',
            ),
            'staff-login-code' => new GoogleOAuthIdentity(
                email: TestTenantFixture::TENANT_A_EMAIL,
                googleId: 'google-staff-login-id',
                fullName: 'Tenant A Google Staff',
                avatarUrl: 'https://cdn.example.test/google/staff-a.jpg',
                idToken: 'google-id-token-staff-login',
                accessToken: 'google-access-token-staff-login',
            ),
            'pwa-code' => new GoogleOAuthIdentity(
                email: 'client.google.pwa@example.test',
                googleId: 'google-pwa-client-id',
                fullName: 'Cliente Google PWA',
                avatarUrl: 'https://cdn.example.test/google/client.jpg',
                idToken: 'google-id-token-pwa',
                accessToken: 'google-access-token-pwa',
            ),
        ]));
    }

    protected function tearDown(): void
    {
        LeagueGoogleOAuthProvider::setTestOverride(null);
        parent::tearDown();
    }

    public function testGoogleStaffRegisterReturnsPendingTokenWithoutProvisioning(): void
    {
        $stateToken = $this->startGoogleFlow([
            'context' => 'staff_register',
            'redirect_uri' => self::CALLBACK_URL,
            'full_name' => 'Marco Google',
        ]);

        $this->client->jsonRequest('POST', '/api/oauth/google/complete', [
            'code' => 'staff-register-code',
            'state' => $stateToken,
            'state_cookie' => $stateToken,
            'redirect_uri' => self::CALLBACK_URL,
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame('staff_register_pending', $payload['context'] ?? null);
        self::assertSame('owner.google.register@example.test', $payload['email'] ?? null);
        self::assertSame('Marco Google', $payload['fullName'] ?? null);
        self::assertIsString($payload['pendingToken'] ?? null);

        $this->em->clear();

        $user = $this->em->getRepository(User::class)->findOneBy([
            'email' => 'owner.google.register@example.test',
        ]);
        self::assertNull($user);

        $legalAcceptanceCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM legal_acceptance_events',
        );
        self::assertSame(0, $legalAcceptanceCount);
    }

    public function testGoogleStaffRegisterFinalizeCreatesOwnerAndReturnsJwt(): void
    {
        $stateToken = $this->startGoogleFlow([
            'context' => 'staff_register',
            'redirect_uri' => self::CALLBACK_URL,
            'full_name' => 'Marco Google',
        ]);

        $this->client->jsonRequest('POST', '/api/oauth/google/complete', [
            'code' => 'staff-register-code',
            'state' => $stateToken,
            'state_cookie' => $stateToken,
            'redirect_uri' => self::CALLBACK_URL,
        ]);

        self::assertResponseIsSuccessful();

        $pendingPayload = $this->responsePayload();
        self::assertSame('staff_register_pending', $pendingPayload['context'] ?? null);
        self::assertIsString($pendingPayload['pendingToken'] ?? null);

        $this->client->jsonRequest('POST', '/api/register/google/finalize', [
            'pending_token' => $pendingPayload['pendingToken'],
            'business_name' => 'Marco Google Barber',
            'business_type' => 'barbiere',
            'accepted_terms' => true,
        ]);

        self::assertResponseStatusCodeSame(201);

        $payload = $this->responsePayload();
        self::assertSame('marco-google-barber', $payload['tenantSlug'] ?? null);
        self::assertSame('owner', $payload['currentRole'] ?? null);
        self::assertIsString($payload['token'] ?? null);

        $this->em->clear();
        $this->disableTenantFilterForAssertions();

        $userRow = $this->em->getConnection()->fetchAssociative(
            'SELECT id, email FROM users WHERE email = :email',
            ['email' => 'owner.google.register@example.test'],
        );
        self::assertIsArray($userRow);
        self::assertSame('owner.google.register@example.test', $userRow['email'] ?? null);

        $profileRow = $this->em->getConnection()->fetchAssociative(
            'SELECT full_name, avatar_url, user_type FROM profiles WHERE id = :id',
            ['id' => $userRow['id']],
        );
        self::assertIsArray($profileRow);
        self::assertSame('Marco Google', $profileRow['full_name'] ?? null);
        self::assertSame('https://cdn.example.test/google/marco.jpg', $profileRow['avatar_url'] ?? null);
        self::assertSame('staff', $profileRow['user_type'] ?? null);

        $tenantRow = $this->em->getConnection()->fetchAssociative(
            'SELECT id, slug FROM tenants WHERE slug = :slug',
            ['slug' => 'marco-google-barber'],
        );
        self::assertIsArray($tenantRow);
        self::assertSame('marco-google-barber', $tenantRow['slug'] ?? null);

        $legalAcceptanceRow = $this->em->getConnection()->fetchAssociative(
            'SELECT source FROM legal_acceptance_events WHERE user_id = :user_id',
            ['user_id' => $userRow['id']],
        );
        self::assertIsArray($legalAcceptanceRow);
        self::assertSame('GOOGLE_OAUTH_REGISTER', $legalAcceptanceRow['source'] ?? null);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$payload['token'],
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $mePayload = $this->responsePayload();
        self::assertSame('owner.google.register@example.test', $mePayload['user']['email'] ?? null);
        self::assertSame('marco-google-barber', $mePayload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $mePayload['currentRole'] ?? null);
    }

    public function testGoogleStaffLoginReturnsJwtForExistingStaff(): void
    {
        $fixture = self::getContainer()->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);
        $fixture->seedTwoTenantsWithClients();
        $this->em->clear();

        $stateToken = $this->startGoogleFlow([
            'context' => 'staff_login',
            'redirect_uri' => self::CALLBACK_URL,
            'redirect_to' => '/dashboard/team',
        ]);

        $this->client->jsonRequest('POST', '/api/oauth/google/complete', [
            'code' => 'staff-login-code',
            'state' => $stateToken,
            'state_cookie' => $stateToken,
            'redirect_uri' => self::CALLBACK_URL,
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame('staff', $payload['context'] ?? null);
        self::assertSame('/dashboard/team', $payload['redirectTo'] ?? null);
        self::assertIsString($payload['token'] ?? null);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$payload['token'],
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $mePayload = $this->responsePayload();
        self::assertSame(TestTenantFixture::TENANT_A_EMAIL, $mePayload['user']['email'] ?? null);
        self::assertSame('tenant-a-api', $mePayload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $mePayload['currentRole'] ?? null);
    }

    public function testGooglePwaProvisioningCreatesClientForRequestedTenant(): void
    {
        $fixture = self::getContainer()->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);
        $fixture->seedTwoTenantsWithClients();
        $this->em->clear();

        $stateToken = $this->startGoogleFlow([
            'context' => 'pwa',
            'redirect_uri' => self::CALLBACK_URL,
            'tenant_slug' => 'tenant-a-api',
            'return_to' => '/prenota/conferma',
        ]);

        $this->client->jsonRequest('POST', '/api/oauth/google/complete', [
            'code' => 'pwa-code',
            'state' => $stateToken,
            'state_cookie' => $stateToken,
            'redirect_uri' => self::CALLBACK_URL,
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame('pwa', $payload['context'] ?? null);
        self::assertSame('tenant-a-api', $payload['tenantSlug'] ?? null);
        self::assertSame('/prenota/conferma', $payload['returnTo'] ?? null);
        self::assertSame('google-id-token-pwa', $payload['googleIdToken'] ?? null);
        self::assertSame('google-access-token-pwa', $payload['googleAccessToken'] ?? null);
        self::assertTrue($payload['isNewClient'] ?? false);

        $this->em->clear();
        $this->disableTenantFilterForAssertions();

        $user = $this->em->getRepository(User::class)->findOneBy([
            'email' => 'client.google.pwa@example.test',
        ]);
        self::assertInstanceOf(User::class, $user);

        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        self::assertInstanceOf(Profile::class, $profile);
        self::assertSame('client', $profile->getUserType());

        $tenantA = $this->em->getRepository(Tenant::class)->findOneBy(['slug' => 'tenant-a-api']);
        $tenantB = $this->em->getRepository(Tenant::class)->findOneBy(['slug' => 'tenant-b-api']);
        self::assertInstanceOf(Tenant::class, $tenantA);
        self::assertInstanceOf(Tenant::class, $tenantB);

        $clientA = $this->em->getRepository(Client::class)->findOneBy([
            'tenant' => $tenantA,
            'profile' => $profile,
        ]);
        self::assertInstanceOf(Client::class, $clientA);
        self::assertSame('client.google.pwa@example.test', $clientA->getEmail());
        self::assertNull($clientA->getPhone());

        $clientB = $this->em->getRepository(Client::class)->findOneBy([
            'tenant' => $tenantB,
            'profile' => $profile,
        ]);
        self::assertNull($clientB);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function startGoogleFlow(array $payload): string
    {
        $this->client->jsonRequest('POST', '/api/oauth/google/start', $payload);
        self::assertResponseIsSuccessful();

        $responsePayload = $this->responsePayload();
        self::assertIsString($responsePayload['authorizationUrl'] ?? null);
        self::assertIsString($responsePayload['stateToken'] ?? null);

        return $responsePayload['stateToken'];
    }

    /**
     * @return array<string, mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }

    private function disableTenantFilterForAssertions(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }
    }
}
