<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class UpdateMyPasswordEndpointTest extends WebTestCase
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

    public function testPasswordCanBeUpdatedWithCurrentPassword(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL, TestTenantFixture::PASSWORD);

        $this->client->jsonRequest('POST', '/api/me/password', [
            'currentPassword' => TestTenantFixture::PASSWORD,
            'newPassword' => 'tenant-b-new-password',
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame(['success' => true], $this->responsePayload());

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_B_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseStatusCodeSame(401);

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_B_EMAIL,
            'password' => 'tenant-b-new-password',
        ]);
        self::assertResponseIsSuccessful();
    }

    public function testPasswordUpdateRejectsWrongCurrentPassword(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL, TestTenantFixture::PASSWORD);

        $this->client->jsonRequest('POST', '/api/me/password', [
            'currentPassword' => 'wrong-password',
            'newPassword' => 'tenant-b-new-password',
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('Password attuale non corretta.', $this->responsePayload()['error'] ?? null);

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_B_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseIsSuccessful();
    }

    private function login(string $email, string $password): string
    {
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => $email,
            'password' => $password,
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
