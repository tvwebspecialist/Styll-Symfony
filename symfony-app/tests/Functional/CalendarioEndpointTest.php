<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Fase 1b — Calendario read-only.
 *
 * Tests:
 *  - GET /api/appointments (collection with filters)
 *  - GET /api/appointments/{id} (single item with services)
 *  - GET /api/availability/slots (slot calculation: working hours + override + appointments)
 *
 * All tests verify multi-tenant isolation: tenant A cannot access tenant B data.
 */
final class CalendarioEndpointTest extends WebTestCase
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
        $this->seed = $fixture->seedTwoTenantsWithCalendarData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── GET /api/appointments ─────────────────────────────────────────────────

    public function testGetAppointmentsRequiresAuth(): void
    {
        $this->browser->request('GET', '/api/appointments');
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetAppointmentsReturnsTenantOwnAppointments(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('GET', '/api/appointments', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $items = $this->extractItems($this->json());
        $ids = array_column($items, 'id');
        self::assertContains($apptId, $ids, 'Tenant A appointment must appear in tenant A collection.');
    }

    public function testGetAppointmentsTenantIsolation(): void
    {
        $tokenA = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptBId = (string) $this->seed['appointmentB']->getId();

        $this->browser->request('GET', '/api/appointments', server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $items = $this->extractItems($this->json());
        $ids = array_column($items, 'id');
        self::assertNotContains($apptBId, $ids, 'Tenant B appointment must NOT appear for tenant A.');
    }

    public function testGetAppointmentsDateFilterInRange(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        // Appointment is on 2030-01-14; query for that day
        $this->browser->request('GET', '/api/appointments?from=2030-01-14&to=2030-01-15', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertContains($apptId, $ids);
    }

    public function testGetAppointmentsDateFilterExcludesOutOfRange(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        // Appointment is on 2030-01-14; query only up to 2030-01-13 → must not appear
        $this->browser->request('GET', '/api/appointments?from=2030-01-01&to=2030-01-14', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertNotContains($apptId, $ids);
    }

    public function testGetAppointmentsStaffFilter(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffAId = (string) $this->seed['staffA']->getId();
        $apptId   = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('GET', "/api/appointments?staffId=$staffAId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertContains($apptId, $ids);

        // Appointments in result must all belong to staffA
        $staffIds = array_column($this->extractItems($this->json()), 'staffId');
        foreach ($staffIds as $id) {
            self::assertSame($staffAId, $id);
        }
    }

    public function testGetAppointmentsStatusFilter(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        // Filter by confirmed — appointment is confirmed
        $this->browser->request('GET', '/api/appointments?status=confirmed', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);

        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertContains($apptId, $ids);

        // Filter by cancelled — appointment must NOT appear
        $this->browser->request('GET', '/api/appointments?status=cancelled', server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/ld+json',
        ]);
        self::assertResponseIsSuccessful();
        $ids = array_column($this->extractItems($this->json()), 'id');
        self::assertNotContains($apptId, $ids);
    }

    public function testGetAppointmentsResponseShape(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('GET', "/api/appointments?from=2030-01-14&to=2030-01-15", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $items = $this->extractItems($this->json());
        $appt = null;
        foreach ($items as $item) {
            if ($item['id'] === $apptId) {
                $appt = $item;
                break;
            }
        }
        self::assertNotNull($appt, 'Appointment A must be in collection.');

        // Verify expected fields are present
        self::assertArrayHasKey('startTime', $appt);
        self::assertArrayHasKey('endTime', $appt);
        self::assertArrayHasKey('status', $appt);
        self::assertArrayHasKey('bookingSource', $appt);
        self::assertArrayHasKey('clientId', $appt);
        self::assertArrayHasKey('clientFullName', $appt);
        self::assertArrayHasKey('staffId', $appt);
        self::assertArrayHasKey('locationId', $appt);
        self::assertArrayHasKey('totalPrice', $appt);
        self::assertSame('confirmed', $appt['status']);
    }

    // ─── GET /api/appointments/{id} ───────────────────────────────────────────

    public function testGetAppointmentItemRequiresAuth(): void
    {
        $apptId = (string) $this->seed['appointmentA']->getId();
        $this->browser->request('GET', "/api/appointments/$apptId");
        self::assertResponseStatusCodeSame(401);
    }

    public function testGetAppointmentItemReturnsCorrectData(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('GET', "/api/appointments/$apptId", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame($apptId, $data['id']);
        self::assertArrayHasKey('startTime', $data);
        self::assertArrayHasKey('services', $data);
        self::assertIsArray($data['services']);
    }

    public function testGetAppointmentItemCrossTenantReturns404(): void
    {
        $tokenB = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $apptIdA = (string) $this->seed['appointmentA']->getId();

        $this->browser->request('GET', "/api/appointments/$apptIdA", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenB",
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    // ─── GET /api/availability/slots ──────────────────────────────────────────

    public function testSlotsRequiresAuth(): void
    {
        $staffId = (string) $this->seed['staffA']->getId();
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-14");
        self::assertResponseStatusCodeSame(401);
    }

    public function testSlotsNormalWorkingDayGeneratesSlots(): void
    {
        $token   = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffId = (string) $this->seed['staffA']->getId();

        // 2030-01-14 is Monday. staffA has working hours Mon 09:00-18:00.
        // No closed override on this date (override is on 2030-01-07).
        // Service duration: 30 min → slots every 30 min from 09:00 to 17:30.
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-14&serviceDuration=30", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertTrue($data['isWorkingDay'], 'Must be a working day.');
        self::assertNotEmpty($data['slots'], 'Must have slots.');

        // With 09:00-18:00 and 30-min step, expect slot 09:00
        $times = array_column($data['slots'], 'time');
        self::assertContains('09:00', $times);
    }

    public function testSlotsClosedOverrideReturnsEmpty(): void
    {
        $token   = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffId = (string) $this->seed['staffA']->getId();

        // 2030-01-07 is Monday but has is_closed=true override
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-07&serviceDuration=30", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertFalse($data['isWorkingDay'], 'Closed override must set isWorkingDay=false.');
        self::assertSame([], $data['slots']);
        self::assertArrayHasKey('reason', $data);
    }

    /**
     * COMBINED TEST: working hours (Mon 09:00-18:00) + closed override (2030-01-07) + existing appointment on 2030-01-14.
     *
     * Verifies that the three sources combine correctly:
     * 1. On 2030-01-07: even though working hours exist for Monday, the closed override wins → no slots.
     * 2. On 2030-01-14: working hours active, appointment 10:00-11:00 blocks overlapping slots.
     */
    public function testSlotsThreeSourcesCombineCorrectly(): void
    {
        $token   = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffId = (string) $this->seed['staffA']->getId();

        // Part 1: override closure wins over working hours
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-07&serviceDuration=30", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseIsSuccessful();
        $closed = $this->json();
        self::assertFalse($closed['isWorkingDay'], 'is_closed override must override working hours → isWorkingDay=false');
        self::assertSame([], $closed['slots'], 'No slots when override is closed');

        // Part 2: working hours active on 2030-01-14, appointment 10:00-11:00 local (09:00-10:00 UTC) blocks slots.
        // Service duration 60 min: slots that overlap [10:00, 11:00] local are blocked.
        // [09:30-10:30] overlaps → blocked; [10:00-11:00] overlaps → blocked; [10:30-11:30] overlaps → blocked.
        // [11:00-12:00] doesn't overlap [10:00,11:00] (11:00 < 11:00 is false) → available.
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-14&serviceDuration=60", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);
        self::assertResponseIsSuccessful();
        $normal = $this->json();
        self::assertTrue($normal['isWorkingDay']);
        self::assertNotEmpty($normal['slots']);

        $slotMap = [];
        foreach ($normal['slots'] as $slot) {
            $slotMap[$slot['time']] = $slot['available'];
        }

        // Appointment is 10:00-11:00 local (Europe/Rome UTC+1 in January = 09:00-10:00 UTC).
        // Busy window local minutes: [600, 660]. slotEnd > busyStart && slotStart < busyEnd.
        self::assertFalse($slotMap['09:30'] ?? true, '09:30 + 60min = 10:30 → 570<660 && 630>600 → blocked');
        self::assertFalse($slotMap['10:00'] ?? true, '10:00 + 60min = 11:00 → 600<660 && 660>600 → blocked');
        self::assertFalse($slotMap['10:30'] ?? true, '10:30 + 60min = 11:30 → 630<660 && 690>600 → blocked');
        // 09:00 + 60min = 10:00 → slotEnd (600) > busyStart (600) is FALSE → available
        self::assertTrue($slotMap['09:00'] ?? false, '09:00 + 60min ends exactly at 10:00 → no overlap');
        // 11:00 + 60min = 12:00 → slotStart (660) < busyEnd (660) is FALSE → available
        self::assertTrue($slotMap['11:00'] ?? false, '11:00 slot starts when appointment ends → available');
    }

    public function testSlotsCrossTenantStaffReturns404(): void
    {
        $tokenA  = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffBId = (string) $this->seed['staffB']->getId();

        // Tenant A token trying to get slots for Tenant B's staff
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffBId&date=2030-01-14&serviceDuration=30", server: [
            'HTTP_AUTHORIZATION' => "Bearer $tokenA",
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testSlotsNonWorkingDayReturnsEmpty(): void
    {
        $token   = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $staffId = (string) $this->seed['staffA']->getId();

        // 2030-01-06 is a Sunday (day_of_week=0). No working hours for Sunday → isWorkingDay=false.
        $this->browser->request('GET', "/api/availability/slots?staffId=$staffId&date=2030-01-06&serviceDuration=30", server: [
            'HTTP_AUTHORIZATION' => "Bearer $token",
        ]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertFalse($data['isWorkingDay']);
        self::assertSame([], $data['slots']);
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

    /**
     * @param array<mixed> $payload
     * @return list<array<string, mixed>>
     */
    private function extractItems(array $payload): array
    {
        return $payload['member'] ?? $payload['hydra:member'] ?? (isset($payload[0]) ? $payload : []);
    }
}
