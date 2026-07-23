<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class CrmClientsEndpointTest extends WebTestCase
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
        $this->seed = $fixture->seedTwoTenantsWithClients();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── GET /api/clients ─────────────────────────────────────────────────────

    public function testGetCollectionRequiresAuth(): void
    {
        $this->browser->request('GET', '/api/clients');
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetCollectionReturnsOnlyOwnTenantClients(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $names = $this->extractNames($this->json());
        self::assertSame(['Tenant A API - Client 1', 'Tenant A API - Client 2'], $names);
    }

    public function testGetCollectionCrossTenantsIsolated(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $names = $this->extractNames($this->json());
        self::assertSame(['Tenant B API - Client 1', 'Tenant B API - Client 2'], $names);
    }

    public function testGetCollectionSearchByName(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->request('GET', '/api/clients?q=client+1', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $names = $this->extractNames($this->json());
        self::assertCount(1, $names);
        self::assertStringContainsString('Client 1', $names[0]);
    }

    // ─── GET /api/clients/{id} ────────────────────────────────────────────────

    public function testGetItemRequiresAuth(): void
    {
        $clientId = $this->getFirstClientIdForTenant('A');
        $this->browser->request('GET', "/api/clients/$clientId");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetItemReturnsSingleClient(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame($clientId, $data['id']);
    }

    public function testGetItemCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientIdA", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── POST /api/clients ────────────────────────────────────────────────────

    public function testPostCreatesClient(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients', [
            'fullName' => 'Nuovo Cliente Test',
            'phone' => '+39000111222',
            'email' => 'nuovo@test.example',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame('Nuovo Cliente Test', $data['fullName']);
        self::assertArrayHasKey('id', $data);
    }

    public function testPostRequiresFullName(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients', [
            'phone' => '+39999888777',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testPostDuplicatePhoneReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients', [
            'fullName' => 'Cliente Uno',
            'phone' => '+39301010101',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(201);

        // Same phone, same tenant → should fail.
        $this->browser->jsonRequest('POST', '/api/clients', [
            'fullName' => 'Cliente Due',
            'phone' => '+39301010101',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertArrayHasKey('violations', $data);
    }

    public function testPostSamePhoneDifferentTenantsAllowed(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $phone = '+39302020202';

        $this->browser->jsonRequest('POST', '/api/clients', [
            'fullName' => 'Cliente Tenant A',
            'phone' => $phone,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $tokenA"]);
        self::assertResponseStatusCodeSame(201);

        // Same phone, different tenant → should succeed.
        $this->browser->jsonRequest('POST', '/api/clients', [
            'fullName' => 'Cliente Tenant B',
            'phone' => $phone,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $tokenB"]);
        self::assertResponseStatusCodeSame(201);
    }

    // ─── PATCH /api/clients/{id} ──────────────────────────────────────────────

    public function testPatchUpdatesClient(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->request(
            'PATCH',
            "/api/clients/$clientId",
            server: [
                'HTTP_AUTHORIZATION' => "Bearer $token",
                'CONTENT_TYPE' => 'application/merge-patch+json',
            ],
            content: json_encode(['email' => 'aggiornato@example.com'], \JSON_THROW_ON_ERROR),
        );

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame('aggiornato@example.com', $data['email']);
    }

    public function testPatchCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');

        $this->browser->request(
            'PATCH',
            "/api/clients/$clientIdA",
            server: [
                'HTTP_AUTHORIZATION' => "Bearer $tokenB",
                'CONTENT_TYPE' => 'application/merge-patch+json',
            ],
            content: json_encode(['email' => 'hack@example.com'], \JSON_THROW_ON_ERROR),
        );

        self::assertResponseStatusCodeSame(404);
    }

    // ─── DELETE /api/clients/{id} — soft delete ───────────────────────────────

    public function testDeleteSoftDeletesClient(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->request('DELETE', "/api/clients/$clientId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(204);

        // Client should no longer appear in collection.
        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertNotContains($clientId, $ids);

        // Client should return 404 on direct GET.
        $this->browser->request('GET', "/api/clients/$clientId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseStatusCodeSame(404);

        // Verify row still exists in DB (soft delete only).
        $em = self::getContainer()->get(EntityManagerInterface::class);
        $row = $em->getConnection()->fetchAssociative(
            'SELECT deleted_at FROM clients WHERE id = :id',
            ['id' => $clientId],
        );
        self::assertIsArray($row);
        self::assertNotNull($row['deleted_at']);
    }

    public function testDeleteCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');

        $this->browser->request('DELETE', "/api/clients/$clientIdA", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/clients/{id}/notes ──────────────────────────────────────────

    public function testGetNotesRequiresAuth(): void
    {
        $clientId = $this->getFirstClientIdForTenant('A');
        $this->browser->request('GET', "/api/clients/$clientId/notes");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetNotesReturnsEmptyList(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientId/notes", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        self::assertSame([], $this->json());
    }

    public function testGetNotesCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientIdA/notes", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── POST /api/clients/{id}/notes ─────────────────────────────────────────

    public function testPostNoteCreatesNote(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/notes", [
            'noteText' => 'Nota privata di test',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame('Nota privata di test', $data['noteText']);
        self::assertArrayHasKey('id', $data);

        // Note should appear in list.
        $this->browser->request('GET', "/api/clients/$clientId/notes", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        $notes = $this->json();
        self::assertCount(1, $notes);
    }

    public function testPostNoteEmptyTextRejected(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/notes", [
            'noteText' => '   ',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    // ─── PATCH/DELETE /api/client-notes/{id} ─────────────────────────────────

    public function testPatchNoteUpdatesText(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');
        $noteId = $this->createNote($token, $clientId, 'Nota originale');

        $this->browser->jsonRequest('PATCH', "/api/client-notes/$noteId", [
            'noteText' => 'Nota aggiornata',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame('Nota aggiornata', $data['noteText']);
    }

    public function testDeleteNoteRemovesNote(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');
        $noteId = $this->createNote($token, $clientId, 'Nota da eliminare');

        $this->browser->request('DELETE', "/api/client-notes/$noteId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(204);

        // Note should no longer appear in list.
        $this->browser->request('GET', "/api/clients/$clientId/notes", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertSame([], $this->json());
    }

    public function testNoteIsolatedCrossTenant(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');
        $noteId = $this->createNote($tokenA, $clientIdA, 'Nota privata A');

        // Tenant B cannot update the note.
        $this->browser->jsonRequest('PATCH', "/api/client-notes/$noteId", [
            'noteText' => 'Hack',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $tokenB"]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/clients/{id}/analytics ─────────────────────────────────────

    public function testGetAnalyticsRequiresAuth(): void
    {
        $clientId = $this->getFirstClientIdForTenant('A');
        $this->browser->request('GET', "/api/clients/$clientId/analytics");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetAnalyticsReturnsDefaultsWhenNoRow(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientId/analytics", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame($clientId, $data['clientId']);
        self::assertArrayHasKey('churnStatus', $data);
        self::assertArrayHasKey('totalVisits', $data);
    }

    public function testGetAnalyticsCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $clientIdA = $this->getFirstClientIdForTenant('A');

        $this->browser->request('GET', "/api/clients/$clientIdA/analytics", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── POST /api/clients/bulk-import ────────────────────────────────────────

    public function testBulkImportRequiresAuth(): void
    {
        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [['0' => 'Test']],
            'mapping' => ['0' => 'full_name'],
        ]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testBulkImportCreatesClients(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [
                ['0' => 'Importato Uno', '1' => '+39401000001', '2' => 'uno@import.test'],
                ['0' => 'Importato Due', '1' => '+39401000002', '2' => 'due@import.test'],
            ],
            'mapping' => ['0' => 'full_name', '1' => 'phone', '2' => 'email'],
            'source' => 'csv_upload',
            'filename' => 'test.csv',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame(2, $data['imported']);
        self::assertSame(0, $data['skipped']);
        self::assertArrayHasKey('jobId', $data);

        // Verify in collection.
        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        self::assertResponseIsSuccessful();
        $names = array_column($this->extractItems($this->json()), 'fullName');
        self::assertContains('Importato Uno', $names);
    }

    public function testBulkImportSkipsDuplicatePhone(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $duplicatePhone = '+39402000001';

        // First import.
        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [['0' => 'Originale', '1' => $duplicatePhone]],
            'mapping' => ['0' => 'full_name', '1' => 'phone'],
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(201);

        // Second import with same phone → must be skipped.
        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [['0' => 'Duplicato', '1' => $duplicatePhone]],
            'mapping' => ['0' => 'full_name', '1' => 'phone'],
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame(0, $data['imported']);
        self::assertSame(1, $data['skipped']);
    }

    public function testBulkImportRequiresFullNameMapping(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [['0' => '+39999']],
            'mapping' => ['0' => 'phone'],
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testBulkImportIsolatedFromOtherTenants(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->browser->jsonRequest('POST', '/api/clients/bulk-import', [
            'rows' => [['0' => 'Solo Tenant A', '1' => '+39501000001']],
            'mapping' => ['0' => 'full_name', '1' => 'phone'],
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $tokenA"]);
        self::assertResponseStatusCodeSame(201);

        // Tenant B collection must NOT contain Tenant A's imported client.
        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        $names = array_column($this->extractItems($this->json()), 'fullName');
        self::assertNotContains('Solo Tenant A', $names);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function login(string $email): string
    {
        $this->browser->jsonRequest('POST', '/api/login', [
            'email' => $email,
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

    private function getFirstClientIdForTenant(string $letter): string
    {
        $email = $letter === 'A' ? TestTenantFixture::TENANT_A_EMAIL : TestTenantFixture::TENANT_B_EMAIL;
        $token = $this->login($email);

        $this->browser->request('GET', '/api/clients', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        self::assertResponseIsSuccessful();

        $items = $this->extractItems($this->json());
        self::assertNotEmpty($items, "No clients found for tenant $letter");

        return (string) $items[0]['id'];
    }

    private function createNote(string $token, string $clientId, string $text): string
    {
        $this->browser->jsonRequest('POST', "/api/clients/$clientId/notes", [
            'noteText' => $text,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(201);

        return (string) $this->json()['id'];
    }

    /**
     * @param array<mixed> $payload
     * @return list<string>
     */
    private function extractNames(array $payload): array
    {
        $items = $this->extractItems($payload);
        $names = array_map(static fn (array $item): string => (string) $item['fullName'], $items);
        sort($names);

        return $names;
    }

    /**
     * @param array<mixed> $payload
     * @return list<array<string, mixed>>
     */
    private function extractItems(array $payload): array
    {
        return $payload['member'] ?? $payload['hydra:member'] ?? (isset($payload[0]) ? $payload : []);
    }
}
