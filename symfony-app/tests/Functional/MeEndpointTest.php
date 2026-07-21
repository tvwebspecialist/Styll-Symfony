<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class MeEndpointTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $fixture->seedMultiTenantStaffUser();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testMeRequiresJwt(): void
    {
        $this->client->request('GET', '/api/me');

        self::assertResponseStatusCodeSame(401);
    }

    public function testMeReturnsCurrentTenantAndProfileForSingleTenantStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame(TestTenantFixture::TENANT_B_EMAIL, $payload['user']['email'] ?? null);
        self::assertSame('Tenant B API Staff', $payload['profile']['fullName'] ?? null);
        self::assertSame('tenant-b-api', $payload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $payload['currentRole'] ?? null);
        self::assertSame([], $payload['otherTenants'] ?? null);
    }

    public function testMeReturnsOtherTenantsForMultiTenantStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame(TestTenantFixture::TENANT_A_EMAIL, $payload['user']['email'] ?? null);
        self::assertSame('tenant-a-api', $payload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $payload['currentRole'] ?? null);
        self::assertCount(1, $payload['otherTenants'] ?? []);
        self::assertSame('tenant-b-api', $payload['otherTenants'][0]['tenant']['slug'] ?? null);
        self::assertSame('manager', $payload['otherTenants'][0]['role'] ?? null);
    }

    public function testMeCanSelectAnotherAccessibleTenantBySlug(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_TENANT_SLUG' => 'tenant-b-api',
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->responsePayload();
        self::assertSame('tenant-b-api', $payload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('manager', $payload['currentRole'] ?? null);
        self::assertCount(1, $payload['otherTenants'] ?? []);
        self::assertSame('tenant-a-api', $payload['otherTenants'][0]['tenant']['slug'] ?? null);
    }

    public function testMeRejectsExplicitTenantSelectionOutsideMemberships(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_TENANT_SLUG' => 'tenant-a-api',
        ]);

        self::assertResponseStatusCodeSame(403);
        self::assertSame('Tenant access denied', $this->responsePayload()['error'] ?? null);
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
     * @return array<string, mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }
}
