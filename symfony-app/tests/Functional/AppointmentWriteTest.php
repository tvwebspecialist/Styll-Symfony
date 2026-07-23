<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Fase 2a — Appointment CRUD write.
 *
 * Endpoints:
 *   POST   /api/appointments
 *   PATCH  /api/appointments/{id}
 *   PATCH  /api/appointments/{id}/status
 *   DELETE /api/appointments/{id}
 *
 * Key invariants verified:
 *   - 409 on staff time overlap (PostgreSQL 23P01 exclusion constraint)
 *   - 409 on optimistic lock version mismatch
 *   - 422 on invalid status transition
 *   - 404 for cross-tenant access attempts
 *   - Soft delete hides appointment from subsequent GET
 */
final class AppointmentWriteTest extends WebTestCase
{
    private KernelBrowser $browser;
    private array $seed;

    // appointmentA lives at 2030-01-14T09:00:00Z to 10:00:00Z for staffA.
    // New appointments must NOT overlap this window to avoid 409 in unrelated tests.
    private const APPT_START_CLEAR = '2030-01-14T11:00:00+00:00';
    private const APPT_END_CLEAR   = '2030-01-14T12:00:00+00:00';

    // Intentional overlap with appointmentA (09:30–10:30 overlaps 09:00–10:00)
    private const APPT_START_OVERLAP = '2030-01-14T09:30:00+00:00';
    private const APPT_END_OVERLAP   = '2030-01-14T10:30:00+00:00';

    protected function setUp(): void
    {
        $this->browser = self::createClient();

        $container = self::getContainer();
        $fixture   = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $this->seed = $fixture->seedTwoTenantsWithBookingData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── POST /api/appointments ───────────────────────────────────────────────

    public function testCreateAppointmentRequiresAuth(): void
    {
        $this->browser->jsonRequest('POST', '/api/appointments', []);
        self::assertResponseStatusCodeSame(401);
    }

    public function testCreateAppointmentSucceeds(): void
    {
        $token  = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $client = $this->seed['clientA'];
        $staff  = $this->seed['staffA'];
        $loc    = $this->seed['locationA'];

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $client->getId(),
            'staffId'    => (string) $staff->getId(),
            'locationId' => (string) $loc->getId(),
            'startTime'  => self::APPT_START_CLEAR,
            'endTime'    => self::APPT_END_CLEAR,
            'notes'      => 'Taglio capelli',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertArrayHasKey('id', $data);
        self::assertSame('confirmed', $data['status']);
        self::assertSame((string) $client->getId(), $data['clientId']);
        self::assertSame((string) $staff->getId(), $data['staffId']);
        self::assertSame((string) $loc->getId(), $data['locationId']);
        self::assertSame('Taglio capelli', $data['notes']);
        self::assertSame(1, $data['version']);
        self::assertSame([], $data['services']);
        self::assertEquals(0, $data['totalPrice']);
    }

    public function testCreateAppointmentWithServicePriceSnapshot(): void
    {
        $token   = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $service = $this->seed['serviceA'];

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $this->seed['clientA']->getId(),
            'staffId'    => (string) $this->seed['staffA']->getId(),
            'locationId' => (string) $this->seed['locationA']->getId(),
            'startTime'  => self::APPT_START_CLEAR,
            'endTime'    => self::APPT_END_CLEAR,
            'serviceIds' => [(string) $service->getId()],
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertCount(1, $data['services']);
        self::assertSame((string) $service->getId(), $data['services'][0]['id']);
        self::assertSame('25.00', $data['services'][0]['priceAtBooking']);
        self::assertEquals(25.0, $data['totalPrice']);
    }

    public function testCreateAppointmentOverlapReturns409(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        // appointmentA already occupies staffA at 09:00–10:00 UTC on 2030-01-14.
        // Attempting 09:30–10:30 triggers the DB exclusion constraint → 409.
        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $this->seed['clientA']->getId(),
            'staffId'    => (string) $this->seed['staffA']->getId(),
            'locationId' => (string) $this->seed['locationA']->getId(),
            'startTime'  => self::APPT_START_OVERLAP,
            'endTime'    => self::APPT_END_OVERLAP,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(409);
        $data = $this->json();
        self::assertSame('OVERLAP_CONFLICT', $data['code']);
    }

    public function testCreateAppointmentCrossTenantClientReturns422(): void
    {
        // Tenant A cannot create an appointment referencing a client from Tenant B
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $this->seed['clientBCross']->getId(),
            'staffId'    => (string) $this->seed['staffA']->getId(),
            'locationId' => (string) $this->seed['locationA']->getId(),
            'startTime'  => self::APPT_START_CLEAR,
            'endTime'    => self::APPT_END_CLEAR,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testCreateAppointmentMissingRequiredFieldsReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId' => (string) $this->seed['clientA']->getId(),
            // missing staffId, locationId, startTime, endTime
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertArrayHasKey('fields', $data);
    }

    public function testCreateAppointmentPendingStatusAllowed(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $this->seed['clientA']->getId(),
            'staffId'    => (string) $this->seed['staffA']->getId(),
            'locationId' => (string) $this->seed['locationA']->getId(),
            'startTime'  => self::APPT_START_CLEAR,
            'endTime'    => self::APPT_END_CLEAR,
            'status'     => 'pending',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        self::assertSame('pending', $this->json()['status']);
    }

    public function testCreateAppointmentInvalidStatusReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);

        $this->browser->jsonRequest('POST', '/api/appointments', [
            'clientId'   => (string) $this->seed['clientA']->getId(),
            'staffId'    => (string) $this->seed['staffA']->getId(),
            'locationId' => (string) $this->seed['locationA']->getId(),
            'startTime'  => self::APPT_START_CLEAR,
            'endTime'    => self::APPT_END_CLEAR,
            'status'     => 'completed', // not allowed on creation
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    // ─── PATCH /api/appointments/{id} ─────────────────────────────────────────

    public function testUpdateAppointmentRequiresAuth(): void
    {
        $id = (string) $this->seed['appointmentA']->getId();
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", ['version' => 1]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testUpdateAppointmentNotesSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", [
            'version' => 1,
            'notes'   => 'Updated note',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame('Updated note', $data['notes']);
        self::assertSame(2, $data['version'], 'Version incremented after update');
    }

    public function testUpdateAppointmentRescheduleSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", [
            'version'   => 1,
            'startTime' => self::APPT_START_CLEAR,
            'endTime'   => self::APPT_END_CLEAR,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertStringContainsString('11:00', $data['startTime']);
        self::assertStringContainsString('12:00', $data['endTime']);
    }

    public function testUpdateAppointmentOptimisticLockConflictReturns409(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        // appointmentA was just created → version = 1.
        // Sending version = 999 simulates a stale client that missed prior updates.
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", [
            'version' => 999,
            'notes'   => 'Stale update',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(409);
        $data = $this->json();
        self::assertSame('OPTIMISTIC_LOCK_CONFLICT', $data['code']);
    }

    public function testUpdateAppointmentCrossTenantReturns404(): void
    {
        // Tenant A tries to update Tenant B's appointment
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentB']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", [
            'version' => 1,
            'notes'   => 'Cross-tenant attack',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testUpdateAppointmentMissingVersionReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id", [
            'notes' => 'No version field',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    // ─── PATCH /api/appointments/{id}/status ──────────────────────────────────

    public function testUpdateStatusRequiresAuth(): void
    {
        $id = (string) $this->seed['appointmentA']->getId();
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", ['status' => 'completed']);
        self::assertResponseStatusCodeSame(401);
    }

    public function testUpdateStatusConfirmedToCompletedSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        // appointmentA is confirmed → completed is a valid transition
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
            'notes'  => 'Visita completata.',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame('completed', $data['status']);
        self::assertSame('Visita completata.', $data['notes']);
        self::assertArrayHasKey('version', $data);
        self::assertArrayHasKey('updatedAt', $data);
    }

    public function testUpdateStatusConfirmedToCancelledSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'cancelled',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        self::assertSame('cancelled', $this->json()['status']);
    }

    public function testUpdateStatusInvalidTransitionReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        // confirmed → pending is not a valid transition
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'pending',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertSame('INVALID_TRANSITION', $data['code']);
    }

    public function testUpdateStatusTerminalCancelledReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        // First: transition to cancelled (terminal)
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'cancelled',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseIsSuccessful();

        // Then: try to transition again → 422 (terminal state)
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'confirmed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(422);
        self::assertSame('INVALID_TRANSITION', $this->json()['code']);
    }

    public function testUpdateStatusCrossTenantReturns404(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentB']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'cancelled',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── DELETE /api/appointments/{id} ────────────────────────────────────────

    public function testDeleteAppointmentRequiresAuth(): void
    {
        $id = (string) $this->seed['appointmentA']->getId();
        $this->browser->request('DELETE', "/api/appointments/$id");
        self::assertResponseStatusCodeSame(401);
    }

    public function testDeleteAppointmentSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('DELETE', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(204);
    }

    public function testDeletedAppointmentHiddenFromGet(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        // Verify it exists first
        $this->browser->request('GET', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseIsSuccessful();

        // Soft delete
        $this->browser->request('DELETE', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseStatusCodeSame(204);

        // GET must now return 404 (AppointmentSoftDeleteExtension hides deleted rows)
        $this->browser->request('GET', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseStatusCodeSame(404);
    }

    public function testDeleteAppointmentCrossTenantReturns404(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentB']->getId();

        $this->browser->request('DELETE', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testDeleteAlreadyDeletedAppointmentReturns404(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('DELETE', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseStatusCodeSame(204);

        // Second DELETE on same ID returns 404 (already soft-deleted, filtered out)
        $this->browser->request('DELETE', "/api/appointments/$id", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
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
