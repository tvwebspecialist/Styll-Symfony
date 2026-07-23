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

final class AdminTenantContentControllerTest extends WebTestCase
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

    public function testServicesEndpointRejectsNormalStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', sprintf(
            '/api/admin/tenants/%s/services',
            $this->seed['tenantA']->getId()->toRfc4122(),
        ), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSuperadminCanCreateAndListTenantService(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tenantId = $this->seed['tenantA']->getId()->toRfc4122();

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/services', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame([], $this->responsePayload());

        $this->client->jsonRequest('POST', sprintf('/api/admin/tenants/%s/services', $tenantId), [
            'name' => 'Taglio prova admin',
            'description' => 'Servizio creato via test admin',
            'price' => 27.5,
            'duration_minutes' => 35,
            'category' => 'Barba',
            'display_order' => 0,
            'is_active' => true,
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(201);
        $created = $this->responsePayload();
        self::assertTrue($created['success'] ?? false);
        self::assertIsString($created['id'] ?? null);

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/services', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $services = $this->responsePayload();
        self::assertCount(1, $services);
        self::assertSame('Taglio prova admin', $services[0]['name'] ?? null);
        self::assertSame(35, $services[0]['duration_minutes'] ?? null);
        self::assertSame(27.5, (float) ($services[0]['price'] ?? 0));
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
