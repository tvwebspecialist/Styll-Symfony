<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class ClientsEndpointTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $fixture->seedTwoTenantsWithClients();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testGetClientsRequiresJwt(): void
    {
        $this->client->request('GET', '/api/clients');

        self::assertResponseStatusCodeSame(401);
    }

    public function testGetClientsReturnsOnlyAuthenticatedTenantClients(): void
    {
        $tenantAToken = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->client->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$tenantAToken,
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame(
            ['Tenant A API - Client 1', 'Tenant A API - Client 2'],
            $this->clientNamesFromResponse(),
        );
    }

    public function testGetClientsWithDifferentTenantJwtReturnsDifferentTenantData(): void
    {
        $tenantBToken = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$tenantBToken,
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame(
            ['Tenant B API - Client 1', 'Tenant B API - Client 2'],
            $this->clientNamesFromResponse(),
        );
    }

    private function login(string $email): string
    {
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => $email,
            'password' => TestTenantFixture::PASSWORD,
        ]);

        self::assertResponseIsSuccessful();

        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);
        self::assertArrayHasKey('token', $payload);
        self::assertIsString($payload['token']);

        return $payload['token'];
    }

    /**
     * @return list<string>
     */
    private function clientNamesFromResponse(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        $items = $payload['member'] ?? $payload['hydra:member'] ?? $payload;
        self::assertIsArray($items);

        $names = array_map(
            static function (array $item): string {
                self::assertArrayHasKey('fullName', $item);
                self::assertIsString($item['fullName']);

                return $item['fullName'];
            },
            $items,
        );
        sort($names);

        return $names;
    }
}
