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

final class AdminTenantDataControllerTest extends WebTestCase
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

    public function testClientsEndpointRejectsNormalStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('GET', sprintf(
            '/api/admin/tenants/%s/clients',
            $this->seed['tenantA']->getId()->toRfc4122(),
        ), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSuperadminCanCreateClientAndPersistConsentAudit(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tenantId = $this->seed['tenantA']->getId()->toRfc4122();
        $actorId = $this->seed['userA']->getId()->toRfc4122();

        $this->client->jsonRequest('POST', sprintf('/api/admin/tenants/%s/clients', $tenantId), [
            'full_name' => 'Cliente Admin Symfony',
            'email' => 'cliente-admin-symfony@example.test',
            'phone' => '+393330001111',
            'consent' => $this->seedConsentPayload($actorId),
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(201);
        $created = $this->responsePayload();
        self::assertTrue($created['success'] ?? false);
        self::assertIsString($created['id'] ?? null);

        $clientId = $created['id'];
        $consentCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM consent_events WHERE tenant_id = :tenant_id AND client_id = :client_id',
            ['tenant_id' => $tenantId, 'client_id' => $clientId],
        );
        self::assertSame(3, $consentCount);

        $marketingConsent = $this->em->getConnection()->fetchOne(
            'SELECT marketing_consent FROM clients WHERE id = :id',
            ['id' => $clientId],
        );
        self::assertFalse((bool) $marketingConsent);

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/clients', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $clients = $this->responsePayload();
        $clientNames = array_map(
            static fn (array $row): ?string => $row['full_name'] ?? null,
            $clients,
        );
        self::assertContains('Cliente Admin Symfony', $clientNames);
    }

    public function testSuperadminCanCreateAppointmentAndUpdateStatus(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tenantId = $this->seed['tenantA']->getId()->toRfc4122();
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        $locationId = Uuid::v4()->toRfc4122();
        $serviceId = Uuid::v4()->toRfc4122();
        $this->em->getConnection()->insert('locations', [
            'id' => $locationId,
            'tenant_id' => $tenantId,
            'name' => 'Sede Admin Test',
            'timezone' => 'Europe/Rome',
            'is_active' => 1,
            'show_on_website' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->em->getConnection()->insert('services', [
            'id' => $serviceId,
            'tenant_id' => $tenantId,
            'name' => 'Taglio Admin Test',
            'price' => 25.00,
            'duration_minutes' => 30,
            'display_order' => 0,
            'is_active' => 1,
            'show_on_website' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $staffId = (string) $this->em->getConnection()->fetchOne(
            'SELECT id FROM staff_members WHERE tenant_id = :tenant_id LIMIT 1',
            ['tenant_id' => $tenantId],
        );
        $clientId = (string) $this->em->getConnection()->fetchOne(
            'SELECT id FROM clients WHERE tenant_id = :tenant_id AND deleted_at IS NULL LIMIT 1',
            ['tenant_id' => $tenantId],
        );

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/appointments/options', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);
        self::assertResponseIsSuccessful();
        $options = $this->responsePayload();
        self::assertCount(2, $options['clients'] ?? []);
        self::assertCount(1, $options['services'] ?? []);
        self::assertCount(1, $options['locations'] ?? []);

        $this->client->jsonRequest('POST', sprintf('/api/admin/tenants/%s/appointments', $tenantId), [
            'clientId' => $clientId,
            'staffId' => $staffId,
            'locationId' => $locationId,
            'serviceIds' => [$serviceId],
            'startTime' => '2026-07-22T09:30:00+00:00',
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(201);
        $created = $this->responsePayload();
        self::assertTrue($created['success'] ?? false);
        self::assertIsString($created['data']['id'] ?? null);
        $appointmentId = $created['data']['id'];

        $this->client->jsonRequest('PATCH', sprintf(
            '/api/admin/tenants/%s/appointments/%s/status',
            $tenantId,
            $appointmentId,
        ), [
            'status' => 'completed',
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);
        self::assertResponseIsSuccessful();

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/appointments', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);
        self::assertResponseIsSuccessful();
        $appointments = $this->responsePayload();
        self::assertCount(1, $appointments);
        self::assertSame('completed', $appointments[0]['status'] ?? null);
        self::assertSame(['Taglio Admin Test'], $appointments[0]['service_names'] ?? null);
    }

    public function testSuperadminCanCommitImportJobAndReadErrors(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tenantId = $this->seed['tenantA']->getId()->toRfc4122();
        $actorId = $this->seed['userA']->getId()->toRfc4122();

        $this->client->jsonRequest('POST', sprintf('/api/admin/tenants/%s/client-imports/commit', $tenantId), [
            'source' => 'csv_generic',
            'filename' => 'import.csv',
            'totalRows' => 1,
            'merged' => 0,
            'skipped' => 0,
            'status' => 'partial',
            'errors' => [
                ['rowIndex' => 7, 'field' => 'email', 'message' => 'Email duplicata'],
            ],
            'toInsert' => [
                [
                    'full_name' => 'Cliente Import Symfony',
                    'email' => 'cliente-import-symfony@example.test',
                    'phone' => '+393339998887',
                    'marketing_consent' => false,
                    'preferred_contact_channel' => 'whatsapp',
                    'tags' => ['imported', 'concierge'],
                    'consent' => $this->seedConsentPayload($actorId, 'CLIENT_IMPORT'),
                ],
            ],
            'toUpdate' => [],
        ], server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(201);
        $created = $this->responsePayload();
        self::assertTrue($created['success'] ?? false);
        self::assertIsString($created['jobId'] ?? null);
        $jobId = $created['jobId'];

        $this->client->request('GET', sprintf('/api/admin/tenants/%s/client-import-jobs', $tenantId), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);
        self::assertResponseIsSuccessful();
        $jobs = $this->responsePayload();
        self::assertCount(1, $jobs);
        self::assertSame(1, $jobs[0]['imported_count'] ?? null);
        self::assertSame('partial', $jobs[0]['status'] ?? null);

        $this->client->request('GET', sprintf(
            '/api/admin/tenants/%s/client-import-jobs/%s/errors',
            $tenantId,
            $jobId,
        ), server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);
        self::assertResponseIsSuccessful();
        $errors = $this->responsePayload();
        self::assertCount(1, $errors['errors'] ?? []);
        self::assertSame('Email duplicata', $errors['errors'][0]['message'] ?? null);
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
     * @return array{actor: string, actorProfileId: string, source: string, events: list<array<string, mixed>>}
     */
    private function seedConsentPayload(string $actorId, string $source = 'SUPERADMIN_PANEL'): array
    {
        return [
            'actor' => 'SUPERADMIN',
            'actorProfileId' => $actorId,
            'source' => $source,
            'events' => [
                [
                    'purpose' => 'MARKETING_EMAIL',
                    'channel' => $source === 'CLIENT_IMPORT' ? 'IMPORT' : 'BACKOFFICE',
                    'status' => 'DISALLOWED',
                    'consentText' => 'Marketing email disattivato in backoffice.',
                    'consentTextVersion' => 'marketing-backoffice-v1',
                    'legalBasis' => 'Art. 6(1)(a) GDPR',
                    'metadata' => ['surface' => 'admin_test'],
                ],
                [
                    'purpose' => 'MARKETING_PUSH',
                    'channel' => $source === 'CLIENT_IMPORT' ? 'IMPORT' : 'BACKOFFICE',
                    'status' => 'DISALLOWED',
                    'consentText' => 'Marketing push disattivato in backoffice.',
                    'consentTextVersion' => 'marketing-backoffice-v1',
                    'legalBasis' => 'Art. 6(1)(a) GDPR',
                    'metadata' => ['surface' => 'admin_test'],
                ],
                [
                    'purpose' => 'CHURN_PROFILING',
                    'channel' => $source === 'CLIENT_IMPORT' ? 'IMPORT' : 'BACKOFFICE',
                    'status' => 'ALLOWED',
                    'consentText' => 'Profilazione churn attiva di default.',
                    'consentTextVersion' => 'churn-default-active-v1',
                    'legalBasis' => 'Art. 6(1)(f) GDPR',
                    'metadata' => ['surface' => 'admin_test'],
                ],
            ],
        ];
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
