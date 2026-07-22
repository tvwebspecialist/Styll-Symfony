<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Security\SuperadminAccessChecker;
use App\Service\AdminAuditLogger;
use App\Service\AdminConsentWriter;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/admin')]
final class AdminTenantDataController extends AbstractController
{
    private const DEMO_FIRST_NAMES = [
        'Marco', 'Giulia', 'Andrea', 'Sara', 'Luca', 'Chiara', 'Davide', 'Elena', 'Matteo', 'Francesca',
        'Alessandro', 'Valentina', 'Simone', 'Laura', 'Diego', 'Marta', 'Riccardo', 'Serena', 'Paolo', 'Roberta',
    ];

    private const DEMO_LAST_NAMES = [
        'Rossi', 'Bianchi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Bruno',
        'Conti', 'De Luca', 'Costa', 'Greco', 'Galli', 'Moretti', 'Fontana', 'Barbieri', 'Mancini', 'Pellegrini',
    ];

    private const DEMO_DOMAINS = ['email.it', 'gmail.com', 'libero.it', 'outlook.it'];

    public function __construct(
        private readonly Connection $connection,
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly AdminAuditLogger $adminAuditLogger,
        private readonly AdminConsentWriter $adminConsentWriter,
    ) {}

    #[Route('/tenants/{tenantId}/clients', methods: ['GET'])]
    public function clients(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT c.id, c.full_name, c.phone, c.email, c.tags, c.marketing_consent, c.profile_id, c.created_at, c.date_of_birth, p.avatar_url
                FROM clients c
                LEFT JOIN profiles p ON p.id = c.profile_id
                WHERE c.tenant_id = :tenant_id
                  AND c.deleted_at IS NULL
                ORDER BY c.created_at DESC
                LIMIT 200
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json(array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'tags' => $this->decodeJsonArray($row['tags'] ?? null),
            'marketing_consent' => $this->toBool($row['marketing_consent'] ?? false),
            'profile_id' => $row['profile_id'] !== null ? (string) $row['profile_id'] : null,
            'avatar_url' => $row['avatar_url'] !== null ? (string) $row['avatar_url'] : null,
            'created_at' => $this->toIsoString($row['created_at']),
            'date_of_birth' => $row['date_of_birth'] !== null ? substr((string) $row['date_of_birth'], 0, 10) : null,
        ], $rows));
    }

    #[Route('/tenants/{tenantId}/clients', methods: ['POST'])]
    public function createClient(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $this->connection->beginTransaction();

        try {
            $clientId = $this->createClientRow($tenantId, $currentUser->getId()->toRfc4122(), $payload);
            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'client.created',
            'client',
            $clientId,
            $tenantId,
        );

        return $this->json([
            'success' => true,
            'id' => $clientId,
            'created_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/clients/bulk-create', methods: ['POST'])]
    public function bulkCreateClients(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $clients = is_array($payload['clients'] ?? null) ? $payload['clients'] : [];

        $this->connection->beginTransaction();

        try {
            $insertedIds = [];
            foreach ($clients as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $insertedIds[] = $this->createClientRow($tenantId, $currentUser->getId()->toRfc4122(), $row);
            }

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'client.bulk_created',
            'tenant',
            $tenantId,
            $tenantId,
            ['count' => count($insertedIds)],
        );

        return $this->json([
            'success' => true,
            'inserted' => count($insertedIds),
            'ids' => $insertedIds,
        ], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/clients/{clientId}', methods: ['PATCH'])]
    public function updateClient(string $tenantId, string $clientId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $updates = ['updated_at' => $this->nowIso()];

        if (array_key_exists('full_name', $payload)) {
            $updates['full_name'] = trim((string) $payload['full_name']);
        }
        if (array_key_exists('email', $payload)) {
            $updates['email'] = $this->nullableString($payload['email']);
        }
        if (array_key_exists('phone', $payload)) {
            $updates['phone'] = $this->nullableString($payload['phone']);
        }
        if (array_key_exists('date_of_birth', $payload)) {
            $updates['date_of_birth'] = $this->nullableDate($payload['date_of_birth']);
        }
        if (array_key_exists('tags', $payload)) {
            $updates['tags'] = json_encode($this->normalizeTags($payload['tags']), \JSON_THROW_ON_ERROR);
        }

        $this->connection->beginTransaction();

        try {
            if (count($updates) > 1) {
                $this->connection->update('clients', $updates, [
                    'tenant_id' => $tenantId,
                    'id' => $clientId,
                ]);
            }

            if (isset($payload['consent']) && is_array($payload['consent'])) {
                $this->applyConsentPayload($tenantId, $clientId, $payload['consent']);
            }

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'client.updated',
            'client',
            $clientId,
            $tenantId,
            ['fields' => array_values(array_filter(array_keys($payload), static fn (string $key): bool => $key !== 'consent'))],
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/clients/{clientId}', methods: ['DELETE'])]
    public function deleteClient(string $tenantId, string $clientId): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $this->connection->update('clients', [
            'deleted_at' => $this->nowIso(),
            'deleted_by' => $currentUser->getId()->toRfc4122(),
            'updated_at' => $this->nowIso(),
        ], [
            'tenant_id' => $tenantId,
            'id' => $clientId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'client.deleted',
            'client',
            $clientId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/appointments', methods: ['GET'])]
    public function appointments(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                    a.id,
                    a.start_time,
                    a.end_time,
                    a.status,
                    a.client_id,
                    a.staff_id,
                    a.location_id,
                    c.full_name AS client_name,
                    p.full_name AS staff_name
                FROM appointments a
                LEFT JOIN clients c ON c.id = a.client_id
                LEFT JOIN staff_members sm ON sm.id = a.staff_id
                LEFT JOIN profiles p ON p.id = sm.profile_id
                WHERE a.tenant_id = :tenant_id
                  AND a.deleted_at IS NULL
                ORDER BY a.start_time DESC
                LIMIT 200
            SQL,
            ['tenant_id' => $tenantId],
        );

        $appointmentIds = array_values(array_map(
            static fn (array $row): string => (string) $row['id'],
            $rows,
        ));

        $servicesByAppointment = $this->loadAppointmentServices($appointmentIds);

        return $this->json(array_map(function (array $row) use ($servicesByAppointment): array {
            $services = $servicesByAppointment[(string) $row['id']] ?? [];

            return [
                'id' => (string) $row['id'],
                'start_time' => $this->toIsoString($row['start_time']),
                'end_time' => $this->toIsoString($row['end_time']),
                'status' => (string) $row['status'],
                'client_id' => (string) $row['client_id'],
                'client_name' => $row['client_name'] !== null ? (string) $row['client_name'] : null,
                'staff_id' => (string) $row['staff_id'],
                'staff_name' => $row['staff_name'] !== null ? (string) $row['staff_name'] : null,
                'location_id' => (string) $row['location_id'],
                'service_names' => array_map(static fn (array $service): string => (string) $service['name'], $services),
                'total_price' => array_reduce($services, static fn (float $sum, array $service): float => $sum + (float) $service['price'], 0.0),
            ];
        }, $rows));
    }

    #[Route('/tenants/{tenantId}/appointments/options', methods: ['GET'])]
    public function appointmentOptions(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $clients = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, full_name, email
                FROM clients
                WHERE tenant_id = :tenant_id
                  AND deleted_at IS NULL
                ORDER BY full_name ASC
                LIMIT 500
            SQL,
            ['tenant_id' => $tenantId],
        );

        $staff = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT sm.id, sm.role, p.full_name
                FROM staff_members sm
                INNER JOIN profiles p ON p.id = sm.profile_id
                WHERE sm.tenant_id = :tenant_id
                  AND sm.is_active = TRUE
                  AND sm.deleted_at IS NULL
                ORDER BY p.full_name ASC
                LIMIT 100
            SQL,
            ['tenant_id' => $tenantId],
        );

        $services = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name, price, duration_minutes
                FROM services
                WHERE tenant_id = :tenant_id
                  AND is_active = TRUE
                ORDER BY display_order ASC, created_at ASC
                LIMIT 200
            SQL,
            ['tenant_id' => $tenantId],
        );

        $locations = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name
                FROM locations
                WHERE tenant_id = :tenant_id
                ORDER BY name ASC
                LIMIT 50
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json([
            'clients' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                'email' => $row['email'] !== null ? (string) $row['email'] : null,
            ], $clients),
            'staff' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                'role' => $row['role'] !== null ? (string) $row['role'] : null,
            ], $staff),
            'services' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'price' => (float) $row['price'],
                'duration_minutes' => (int) $row['duration_minutes'],
            ], $services),
            'locations' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
            ], $locations),
        ]);
    }

    #[Route('/tenants/{tenantId}/appointments', methods: ['POST'])]
    public function createAppointment(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $clientId = $this->requiredPayloadString($payload, 'clientId');
        $staffId = $this->requiredPayloadString($payload, 'staffId');
        $locationId = $this->requiredPayloadString($payload, 'locationId');
        $serviceIds = array_values(array_filter(
            is_array($payload['serviceIds'] ?? null) ? $payload['serviceIds'] : [],
            static fn (mixed $value): bool => is_string($value) && trim($value) !== '',
        ));
        if ($serviceIds === []) {
            return $this->json(['error' => 'Seleziona almeno un servizio.'], Response::HTTP_BAD_REQUEST);
        }

        $startAt = new \DateTimeImmutable($this->requiredPayloadString($payload, 'startTime'));
        $status = $this->optionalString($payload['status'] ?? null) ?? 'confirmed';
        $bookingSource = $this->optionalString($payload['bookingSource'] ?? null) ?? 'dashboard_owner';

        $this->assertTenantEntityExists('clients', $tenantId, $clientId, 'Cliente non valido.');
        $this->assertTenantEntityExists('staff_members', $tenantId, $staffId, 'Barbiere non valido.', 'deleted_at IS NULL AND is_active = TRUE');
        $this->assertTenantEntityExists('locations', $tenantId, $locationId, 'Sede non valida.');

        $services = $this->loadServicesForIds($tenantId, $serviceIds);
        if (count($services) !== count($serviceIds)) {
            return $this->json(['error' => 'Servizi non trovati per questo tenant.'], Response::HTTP_BAD_REQUEST);
        }

        $totalMinutes = array_reduce($services, static fn (int $sum, array $service): int => $sum + (int) $service['duration_minutes'], 0);
        $endAt = $startAt->modify(sprintf('+%d minutes', max(30, $totalMinutes)));
        $appointmentId = Uuid::v4()->toRfc4122();
        $now = $this->nowIso();

        $this->connection->beginTransaction();

        try {
            $this->connection->insert('appointments', [
                'id' => $appointmentId,
                'tenant_id' => $tenantId,
                'client_id' => $clientId,
                'staff_id' => $staffId,
                'location_id' => $locationId,
                'start_time' => $startAt->format(\DateTimeInterface::ATOM),
                'end_time' => $endAt->format(\DateTimeInterface::ATOM),
                'status' => $status,
                'booking_source' => $bookingSource,
                'created_by' => $currentUser->getId()->toRfc4122(),
                'payment_status' => 'unpaid',
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($services as $service) {
                $this->connection->insert('appointment_services', [
                    'id' => Uuid::v4()->toRfc4122(),
                    'tenant_id' => $tenantId,
                    'appointment_id' => $appointmentId,
                    'service_id' => $service['id'],
                    'price_at_booking' => $service['price'],
                    'created_at' => $now,
                ]);
            }

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'appointment.created',
            'appointment',
            $appointmentId,
            $tenantId,
        );

        return $this->json([
            'success' => true,
            'data' => [
                'id' => $appointmentId,
                'tenant_id' => $tenantId,
                'client_id' => $clientId,
                'staff_id' => $staffId,
                'location_id' => $locationId,
                'start_time' => $startAt->format(\DateTimeInterface::ATOM),
                'end_time' => $endAt->format(\DateTimeInterface::ATOM),
                'status' => $status,
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/appointments/{appointmentId}/status', methods: ['PATCH'])]
    public function updateAppointmentStatus(string $tenantId, string $appointmentId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $status = $this->requiredPayloadString($payload, 'status');

        $this->connection->update('appointments', [
            'status' => $status,
            'updated_at' => $this->nowIso(),
        ], [
            'tenant_id' => $tenantId,
            'id' => $appointmentId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'appointment.updated',
            'appointment',
            $appointmentId,
            $tenantId,
            ['status' => $status],
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/appointments/{appointmentId}', methods: ['DELETE'])]
    public function deleteAppointment(string $tenantId, string $appointmentId): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $this->connection->update('appointments', [
            'deleted_at' => $this->nowIso(),
            'deleted_by' => $currentUser->getId()->toRfc4122(),
            'updated_at' => $this->nowIso(),
        ], [
            'tenant_id' => $tenantId,
            'id' => $appointmentId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'appointment.deleted',
            'appointment',
            $appointmentId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/appointments/seed', methods: ['POST'])]
    public function seedAppointments(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $count = max(1, min(100, (int) ($payload['count'] ?? 25)));

        $clients = $this->connection->fetchFirstColumn(
            'SELECT id FROM clients WHERE tenant_id = :tenant_id AND deleted_at IS NULL LIMIT 500',
            ['tenant_id' => $tenantId],
        );
        $staff = $this->connection->fetchFirstColumn(
            'SELECT id FROM staff_members WHERE tenant_id = :tenant_id AND is_active = TRUE AND deleted_at IS NULL LIMIT 50',
            ['tenant_id' => $tenantId],
        );
        $locations = $this->connection->fetchFirstColumn(
            'SELECT id FROM locations WHERE tenant_id = :tenant_id LIMIT 20',
            ['tenant_id' => $tenantId],
        );
        $services = $this->connection->fetchAllAssociative(
            'SELECT id, price, duration_minutes FROM services WHERE tenant_id = :tenant_id AND is_active = TRUE LIMIT 100',
            ['tenant_id' => $tenantId],
        );

        if ($clients === [] || $staff === [] || $locations === [] || $services === []) {
            return $this->json(['error' => 'Servono clienti, staff, sedi e servizi attivi per generare appuntamenti demo.'], Response::HTTP_BAD_REQUEST);
        }

        $nowTs = time();
        $daySeconds = 86400;
        $created = 0;

        $this->connection->beginTransaction();

        try {
            for ($i = 0; $i < $count; ++$i) {
                $daysAgo = random_int(0, 29);
                $hour = random_int(9, 17);
                $minute = random_int(0, 1) === 0 ? 0 : 30;
                $start = (new \DateTimeImmutable())->setTimestamp($nowTs - ($daysAgo * $daySeconds))->setTime($hour, $minute);

                $selectedServices = $this->pickRandomServices($services);
                $totalMinutes = array_reduce($selectedServices, static fn (int $sum, array $service): int => $sum + (int) $service['duration_minutes'], 0);
                $end = $start->modify(sprintf('+%d minutes', max(30, $totalMinutes)));
                $appointmentId = Uuid::v4()->toRfc4122();
                $createdAt = $this->nowIso();

                $this->connection->insert('appointments', [
                    'id' => $appointmentId,
                    'tenant_id' => $tenantId,
                    'client_id' => (string) $clients[array_rand($clients)],
                    'staff_id' => (string) $staff[array_rand($staff)],
                    'location_id' => (string) $locations[array_rand($locations)],
                    'start_time' => $start->format(\DateTimeInterface::ATOM),
                    'end_time' => $end->format(\DateTimeInterface::ATOM),
                    'status' => random_int(1, 100) <= 85 ? 'completed' : 'confirmed',
                    'booking_source' => 'dashboard_owner',
                    'created_by' => $currentUser->getId()->toRfc4122(),
                    'payment_status' => 'unpaid',
                    'version' => 1,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);

                foreach ($selectedServices as $service) {
                    $this->connection->insert('appointment_services', [
                        'id' => Uuid::v4()->toRfc4122(),
                        'tenant_id' => $tenantId,
                        'appointment_id' => $appointmentId,
                        'service_id' => $service['id'],
                        'price_at_booking' => $service['price'],
                        'created_at' => $createdAt,
                    ]);
                }

                ++$created;
            }

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'appointment.seeded',
            'tenant',
            $tenantId,
            $tenantId,
            ['count' => $created],
        );

        return $this->json(['success' => true, 'inserted' => $created], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/client-imports/commit', methods: ['POST'])]
    public function commitClientImport(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $toInsert = is_array($payload['toInsert'] ?? null) ? $payload['toInsert'] : [];
        $toUpdate = is_array($payload['toUpdate'] ?? null) ? $payload['toUpdate'] : [];
        $errors = is_array($payload['errors'] ?? null) ? $payload['errors'] : [];
        $source = $this->optionalString($payload['source'] ?? null) ?? 'csv_generic';
        $filename = $this->optionalString($payload['filename'] ?? null);
        $totalRows = max(0, (int) ($payload['totalRows'] ?? 0));
        $merged = max(0, (int) ($payload['merged'] ?? 0));
        $skipped = max(0, (int) ($payload['skipped'] ?? 0));
        $status = $this->optionalString($payload['status'] ?? null) ?? 'completed';

        $imported = 0;

        $this->connection->beginTransaction();

        try {
            foreach ($toUpdate as $row) {
                if (!is_array($row) || !is_string($row['id'] ?? null)) {
                    continue;
                }

                $patch = is_array($row['patch'] ?? null) ? $row['patch'] : [];
                $updates = ['updated_at' => $this->nowIso()];
                if (array_key_exists('full_name', $patch)) {
                    $updates['full_name'] = trim((string) $patch['full_name']);
                }
                if (array_key_exists('email', $patch)) {
                    $updates['email'] = $this->nullableString($patch['email']);
                }
                if (array_key_exists('phone', $patch)) {
                    $updates['phone'] = $this->nullableString($patch['phone']);
                }
                if (array_key_exists('date_of_birth', $patch)) {
                    $updates['date_of_birth'] = $this->nullableDate($patch['date_of_birth']);
                }
                if (array_key_exists('tags', $patch)) {
                    $updates['tags'] = json_encode($this->normalizeTags($patch['tags']), \JSON_THROW_ON_ERROR);
                }

                if (count($updates) > 1) {
                    $this->connection->update('clients', $updates, [
                        'tenant_id' => $tenantId,
                        'id' => $row['id'],
                    ]);
                }

                if (isset($row['consent']) && is_array($row['consent'])) {
                    $this->applyConsentPayload($tenantId, $row['id'], $row['consent']);
                }
            }

            foreach ($toInsert as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $this->createClientRow($tenantId, $currentUser->getId()->toRfc4122(), $row);
                ++$imported;
            }

            $jobId = Uuid::v4()->toRfc4122();
            $this->connection->insert('client_import_jobs', [
                'id' => $jobId,
                'tenant_id' => $tenantId,
                'initiated_by' => $currentUser->getId()->toRfc4122(),
                'source' => $source,
                'filename' => $filename,
                'total_rows' => $totalRows,
                'imported_count' => $imported,
                'merged_count' => $merged,
                'skipped_count' => $skipped,
                'error_count' => count($errors),
                'errors' => json_encode(array_values(array_filter($errors, 'is_array')), \JSON_THROW_ON_ERROR),
                'status' => $status,
                'created_at' => $this->nowIso(),
            ]);

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'client.import.concierge',
            'tenant',
            $tenantId,
            $tenantId,
            [
                'source' => $source,
                'filename' => $filename,
                'total' => $totalRows,
                'imported' => $imported,
                'merged' => $merged,
                'skipped' => $skipped,
                'errors' => count($errors),
            ],
        );

        return $this->json([
            'success' => true,
            'jobId' => $jobId,
            'imported' => $imported,
        ], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/client-import-jobs', methods: ['GET'])]
    public function clientImportJobs(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                    j.id,
                    j.source,
                    j.filename,
                    j.total_rows,
                    j.imported_count,
                    j.merged_count,
                    j.skipped_count,
                    j.error_count,
                    j.status,
                    j.initiated_by,
                    COALESCE(p.email, u.email) AS initiator_email,
                    j.created_at
                FROM client_import_jobs j
                LEFT JOIN profiles p ON p.id = j.initiated_by
                LEFT JOIN users u ON u.id = j.initiated_by
                WHERE j.tenant_id = :tenant_id
                ORDER BY j.created_at DESC
                LIMIT 50
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json(array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'source' => $row['source'] !== null ? (string) $row['source'] : null,
            'filename' => $row['filename'] !== null ? (string) $row['filename'] : null,
            'total_rows' => (int) $row['total_rows'],
            'imported_count' => (int) $row['imported_count'],
            'merged_count' => (int) $row['merged_count'],
            'skipped_count' => (int) $row['skipped_count'],
            'error_count' => (int) $row['error_count'],
            'status' => (string) $row['status'],
            'initiated_by' => $row['initiated_by'] !== null ? (string) $row['initiated_by'] : null,
            'initiator_email' => $row['initiator_email'] !== null ? (string) $row['initiator_email'] : null,
            'created_at' => $this->toIsoString($row['created_at']),
        ], $rows));
    }

    #[Route('/tenants/{tenantId}/client-import-jobs/{jobId}/errors', methods: ['GET'])]
    public function clientImportJobErrors(string $tenantId, string $jobId): JsonResponse
    {
        $this->requireSuperadminUser();

        $row = $this->connection->fetchAssociative(
            'SELECT errors FROM client_import_jobs WHERE tenant_id = :tenant_id AND id = :id LIMIT 1',
            ['tenant_id' => $tenantId, 'id' => $jobId],
        );

        if (!is_array($row)) {
            return $this->json(['error' => 'Job import non trovato.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'errors' => $this->decodeJsonArray($row['errors'] ?? null),
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createClientRow(string $tenantId, string $currentUserId, array $payload): string
    {
        $fullName = trim((string) ($payload['full_name'] ?? ''));
        if ($fullName === '') {
            throw new \RuntimeException('Nome cliente obbligatorio.');
        }

        $clientId = Uuid::v4()->toRfc4122();
        $now = $this->nowIso();

        $this->connection->insert('clients', [
            'id' => $clientId,
            'tenant_id' => $tenantId,
            'full_name' => $fullName,
            'email' => $this->nullableString($payload['email'] ?? null),
            'phone' => $this->nullableString($payload['phone'] ?? null),
            'date_of_birth' => $this->nullableDate($payload['date_of_birth'] ?? null),
            'preferred_contact_channel' => $this->optionalString($payload['preferred_contact_channel'] ?? null) ?? 'whatsapp',
            'marketing_consent' => $this->toBool($payload['marketing_consent'] ?? false) ? 1 : 0,
            'tags' => json_encode($this->normalizeTags($payload['tags'] ?? ['active']), \JSON_THROW_ON_ERROR),
            'churn_opted_out' => 0,
            'created_by' => $currentUserId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        if (isset($payload['consent']) && is_array($payload['consent'])) {
            $this->applyConsentPayload($tenantId, $clientId, $payload['consent']);
        }

        return $clientId;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function applyConsentPayload(string $tenantId, string $clientId, array $payload): void
    {
        $actor = $this->requiredPayloadString($payload, 'actor');
        $source = $this->requiredPayloadString($payload, 'source');
        $actorProfileId = $this->optionalString($payload['actorProfileId'] ?? $payload['actor_profile_id'] ?? null);
        $events = is_array($payload['events'] ?? null) ? $payload['events'] : [];

        $this->adminConsentWriter->recordEvents(
            $tenantId,
            $clientId,
            $actor,
            $actorProfileId,
            $source,
            array_values(array_filter($events, 'is_array')),
        );
    }

    /**
     * @param list<string> $serviceIds
     * @return list<array{id: string, price: float, duration_minutes: int}>
     */
    private function loadServicesForIds(string $tenantId, array $serviceIds): array
    {
        if ($serviceIds === []) {
            return [];
        }

        $params = ['tenant_id' => $tenantId];
        $placeholders = [];
        foreach (array_values($serviceIds) as $index => $serviceId) {
            $key = sprintf('service_%d', $index);
            $placeholders[] = ':'.$key;
            $params[$key] = $serviceId;
        }

        $rows = $this->connection->fetchAllAssociative(
            sprintf('SELECT id, price, duration_minutes FROM services WHERE tenant_id = :tenant_id AND id IN (%s)', implode(',', $placeholders)),
            $params,
        );

        return array_map(static fn (array $row): array => [
            'id' => (string) $row['id'],
            'price' => (float) $row['price'],
            'duration_minutes' => (int) $row['duration_minutes'],
        ], $rows);
    }

    /**
     * @param list<string> $appointmentIds
     * @return array<string, list<array{name: string, price: float}>>
     */
    private function loadAppointmentServices(array $appointmentIds): array
    {
        if ($appointmentIds === []) {
            return [];
        }

        $rows = $this->connection->fetchAllAssociative(
            sprintf(
                <<<'SQL'
                    SELECT aps.appointment_id, s.name, aps.price_at_booking
                    FROM appointment_services aps
                    INNER JOIN services s ON s.id = aps.service_id
                    WHERE aps.appointment_id IN (%s)
                    ORDER BY aps.created_at ASC
                SQL,
                implode(',', array_fill(0, count($appointmentIds), '?')),
            ),
            $appointmentIds,
        );

        $grouped = [];
        foreach ($rows as $row) {
            $appointmentId = (string) $row['appointment_id'];
            $grouped[$appointmentId] ??= [];
            $grouped[$appointmentId][] = [
                'name' => (string) $row['name'],
                'price' => (float) $row['price_at_booking'],
            ];
        }

        return $grouped;
    }

    /**
     * @param list<array<string, mixed>> $services
     * @return list<array{id: string, price: float, duration_minutes: int}>
     */
    private function pickRandomServices(array $services): array
    {
        $targetCount = random_int(1, min(2, count($services)));
        $picked = [];

        while (count($picked) < $targetCount) {
            $candidate = $services[array_rand($services)];
            $alreadyPicked = array_filter($picked, static fn (array $row): bool => $row['id'] === $candidate['id']);
            if ($alreadyPicked !== []) {
                continue;
            }

            $picked[] = [
                'id' => (string) $candidate['id'],
                'price' => (float) $candidate['price'],
                'duration_minutes' => (int) $candidate['duration_minutes'],
            ];
        }

        return $picked;
    }

    private function assertTenantEntityExists(
        string $table,
        string $tenantId,
        string $id,
        string $error,
        string $extraWhere = '1 = 1',
    ): void {
        $exists = $this->connection->fetchOne(
            sprintf(
                'SELECT 1 FROM %s WHERE tenant_id = :tenant_id AND id = :id AND %s LIMIT 1',
                $table,
                $extraWhere,
            ),
            ['tenant_id' => $tenantId, 'id' => $id],
        );

        if (!$exists) {
            throw new \RuntimeException($error);
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requiredPayloadString(array $payload, string $field): string
    {
        $value = $this->optionalString($payload[$field] ?? null);
        if ($value === null) {
            throw new \RuntimeException(sprintf('Campo obbligatorio mancante: %s', $field));
        }

        return $value;
    }

    private function requireSuperadminUser(): User
    {
        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($this->getUser());
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
    }

    private function toIsoString(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        return (new \DateTimeImmutable((string) $value))->format(\DateTimeInterface::ATOM);
    }

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function optionalString(mixed $value): ?string
    {
        return $this->nullableString($value);
    }

    private function nullableDate(mixed $value): ?string
    {
        $stringValue = $this->nullableString($value);
        if ($stringValue === null) {
            return null;
        }

        return (new \DateTimeImmutable($stringValue))->format('Y-m-d');
    }

    /**
     * @return list<mixed>
     */
    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return array_values($value);
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? array_values($decoded) : [];
    }

    /**
     * @return list<string>
     */
    private function normalizeTags(mixed $value): array
    {
        $tags = [];

        if (is_array($value)) {
            $tags = $value;
        } elseif (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $tags = $decoded;
            } else {
                $tags = array_map('trim', explode(',', $value));
            }
        }

        return array_values(array_unique(array_filter(array_map(static fn (mixed $tag): string => trim((string) $tag), $tags))));
    }

    private function toBool(mixed $value): bool
    {
        return filter_var($value, \FILTER_VALIDATE_BOOL, \FILTER_NULL_ON_FAILURE) ?? false;
    }
}
