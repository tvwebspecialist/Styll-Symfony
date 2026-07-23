<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Security\SuperadminAccessChecker;
use App\Service\AdminAuditLogger;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/admin')]
final class AdminTenantContentController extends AbstractController
{
    public function __construct(
        private readonly Connection $connection,
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly AdminAuditLogger $adminAuditLogger,
    ) {}

    #[Route('/tenants/{tenantId}/services', methods: ['GET'])]
    public function services(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name, description, price, duration_minutes, category, display_order, is_active
                FROM services
                WHERE tenant_id = :tenant_id
                ORDER BY display_order ASC, created_at ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json(array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'description' => $row['description'] !== null ? (string) $row['description'] : null,
            'price' => (float) $row['price'],
            'duration_minutes' => (int) $row['duration_minutes'],
            'category' => $row['category'] !== null ? (string) $row['category'] : null,
            'display_order' => (int) ($row['display_order'] ?? 0),
            'is_active' => $this->toBool($row['is_active'] ?? false),
        ], $rows));
    }

    #[Route('/tenants/{tenantId}/services', methods: ['POST'])]
    public function createService(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $now = $this->nowIso();
        $id = Uuid::v4()->toRfc4122();

        $this->connection->insert('services', [
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => trim((string) ($payload['name'] ?? '')),
            'description' => $this->nullableString($payload['description'] ?? null),
            'price' => (float) ($payload['price'] ?? 0),
            'duration_minutes' => (int) ($payload['duration_minutes'] ?? 0),
            'category' => $this->nullableString($payload['category'] ?? null),
            'display_order' => (int) ($payload['display_order'] ?? 0),
            'is_active' => array_key_exists('is_active', $payload) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
            'created_by' => $currentUser->getId()->toRfc4122(),
            'created_at' => $now,
            'updated_at' => $now,
            'show_on_website' => 0,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'service.created',
            'service',
            $id,
            $tenantId,
        );

        return $this->json(['success' => true, 'id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/services/{serviceId}', methods: ['PATCH'])]
    public function updateService(string $tenantId, string $serviceId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $updates = ['updated_at' => $this->nowIso()];

        foreach (['name', 'description', 'category'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = $field === 'name'
                    ? trim((string) $payload[$field])
                    : $this->nullableString($payload[$field]);
            }
        }

        foreach (['price'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = (float) $payload[$field];
            }
        }

        foreach (['duration_minutes', 'display_order'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = (int) $payload[$field];
            }
        }

        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }

        $this->connection->update('services', $updates, [
            'id' => $serviceId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'service.updated',
            'service',
            $serviceId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/services/{serviceId}', methods: ['DELETE'])]
    public function deleteService(string $tenantId, string $serviceId): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $this->connection->delete('services', [
            'id' => $serviceId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'service.deleted',
            'service',
            $serviceId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/services/reorder', methods: ['POST'])]
    public function reorderServices(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $orderedIds = is_array($payload['orderedIds'] ?? null) ? $payload['orderedIds'] : [];
        $now = $this->nowIso();

        foreach ($orderedIds as $index => $serviceId) {
            if (!is_string($serviceId) || trim($serviceId) === '') {
                continue;
            }

            $this->connection->update('services', [
                'display_order' => $index,
                'updated_at' => $now,
            ], [
                'id' => $serviceId,
                'tenant_id' => $tenantId,
            ]);
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'service.reordered',
            'tenant',
            $tenantId,
            $tenantId,
            ['count' => count($orderedIds)],
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/locations', methods: ['GET'])]
    public function locations(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name, address, city, zip_code, phone, email, is_active
                FROM locations
                WHERE tenant_id = :tenant_id
                ORDER BY created_at ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json(array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'address' => $row['address'] !== null ? (string) $row['address'] : null,
            'city' => $row['city'] !== null ? (string) $row['city'] : null,
            'zip_code' => $row['zip_code'] !== null ? (string) $row['zip_code'] : null,
            'phone' => $row['phone'] !== null ? (string) $row['phone'] : null,
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'is_active' => $this->toBool($row['is_active'] ?? false),
        ], $rows));
    }

    #[Route('/tenants/{tenantId}/locations', methods: ['POST'])]
    public function createLocation(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $id = Uuid::v4()->toRfc4122();
        $now = $this->nowIso();

        $this->connection->insert('locations', [
            'id' => $id,
            'tenant_id' => $tenantId,
            'name' => trim((string) ($payload['name'] ?? '')),
            'address' => $this->nullableString($payload['address'] ?? null),
            'city' => $this->nullableString($payload['city'] ?? null),
            'zip_code' => $this->nullableString($payload['zip_code'] ?? null),
            'phone' => $this->nullableString($payload['phone'] ?? null),
            'email' => $this->nullableString($payload['email'] ?? null),
            'timezone' => 'Europe/Rome',
            'is_active' => array_key_exists('is_active', $payload) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
            'created_at' => $now,
            'updated_at' => $now,
            'show_on_website' => 0,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'location.created',
            'location',
            $id,
            $tenantId,
        );

        return $this->json(['success' => true, 'id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/locations/{locationId}', methods: ['PATCH'])]
    public function updateLocation(string $tenantId, string $locationId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $updates = ['updated_at' => $this->nowIso()];

        foreach (['name', 'address', 'city', 'zip_code', 'phone', 'email'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $updates[$field] = $field === 'name'
                ? trim((string) $payload[$field])
                : $this->nullableString($payload[$field]);
        }

        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }

        $this->connection->update('locations', $updates, [
            'id' => $locationId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'location.updated',
            'location',
            $locationId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/locations/{locationId}', methods: ['DELETE'])]
    public function deleteLocation(string $tenantId, string $locationId): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $this->connection->delete('locations', [
            'id' => $locationId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'location.deleted',
            'location',
            $locationId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/staff', methods: ['GET'])]
    public function staffOverview(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $members = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                    sm.id,
                    sm.profile_id,
                    sm.role,
                    sm.bio,
                    sm.is_active,
                    sm.photo_url,
                    sm.created_at,
                    p.full_name AS profile_full_name,
                    COALESCE(p.email, u.email) AS profile_email
                FROM staff_members sm
                INNER JOIN profiles p ON p.id = sm.profile_id
                INNER JOIN users u ON u.id = p.id
                WHERE sm.tenant_id = :tenant_id
                ORDER BY sm.created_at ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        $profiles = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT p.id, p.full_name, COALESCE(p.email, u.email) AS email
                FROM profiles p
                INNER JOIN users u ON u.id = p.id
                WHERE p.user_type = 'staff' OR p.is_superadmin = TRUE
                ORDER BY p.full_name ASC NULLS LAST, u.email ASC
            SQL,
        );

        return $this->json([
            'members' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'profile_id' => (string) $row['profile_id'],
                'role' => (string) $row['role'],
                'bio' => $row['bio'] !== null ? (string) $row['bio'] : null,
                'is_active' => $this->toBool($row['is_active'] ?? false),
                'created_at' => $this->toIsoString($row['created_at']),
                'photo_url' => $row['photo_url'] !== null ? (string) $row['photo_url'] : null,
                'profile' => [
                    'full_name' => $row['profile_full_name'] !== null ? (string) $row['profile_full_name'] : null,
                    'email' => $row['profile_email'] !== null ? (string) $row['profile_email'] : null,
                ],
            ], $members),
            'profiles' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                'email' => $row['email'] !== null ? (string) $row['email'] : null,
            ], $profiles),
        ]);
    }

    #[Route('/tenants/{tenantId}/staff', methods: ['POST'])]
    public function createStaff(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $id = Uuid::v4()->toRfc4122();
        $now = $this->nowIso();

        $this->connection->insert('staff_members', [
            'id' => $id,
            'tenant_id' => $tenantId,
            'profile_id' => (string) ($payload['profile_id'] ?? ''),
            'role' => trim((string) ($payload['role'] ?? 'staff')),
            'bio' => $this->nullableString($payload['bio'] ?? null),
            'photo_url' => $this->nullableString($payload['photo_url'] ?? null),
            'is_active' => array_key_exists('is_active', $payload) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
            'notification_preferences' => json_encode([], \JSON_THROW_ON_ERROR),
            'created_by' => $currentUser->getId()->toRfc4122(),
            'created_at' => $now,
            'updated_at' => $now,
            'show_on_website' => 0,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'staff_member.created',
            'staff_member',
            $id,
            $tenantId,
        );

        return $this->json(['success' => true, 'id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/staff/{staffId}', methods: ['PATCH'])]
    public function updateStaff(string $tenantId, string $staffId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $updates = ['updated_at' => $this->nowIso()];

        foreach (['profile_id', 'role'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = trim((string) $payload[$field]);
            }
        }

        foreach (['bio', 'photo_url'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = $this->nullableString($payload[$field]);
            }
        }

        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }

        $this->connection->update('staff_members', $updates, [
            'id' => $staffId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'staff_member.updated',
            'staff_member',
            $staffId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/staff/{staffId}', methods: ['DELETE'])]
    public function deleteStaff(string $tenantId, string $staffId): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $this->connection->delete('staff_members', [
            'id' => $staffId,
            'tenant_id' => $tenantId,
        ]);

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'staff_member.deleted',
            'staff_member',
            $staffId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/working-hours', methods: ['GET'])]
    public function workingHoursOverview(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $staffRows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT sm.id, p.full_name, COALESCE(p.email, u.email) AS email
                FROM staff_members sm
                INNER JOIN profiles p ON p.id = sm.profile_id
                INNER JOIN users u ON u.id = p.id
                WHERE sm.tenant_id = :tenant_id
                ORDER BY sm.created_at ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        $hourRows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT staff_id, day_of_week, start_time, end_time
                FROM working_hours
                WHERE tenant_id = :tenant_id
                ORDER BY staff_id ASC, day_of_week ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json([
            'staff' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'profile' => [
                    'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                    'email' => $row['email'] !== null ? (string) $row['email'] : null,
                ],
            ], $staffRows),
            'hours' => array_map(fn (array $row): array => [
                'staff_id' => (string) $row['staff_id'],
                'day_of_week' => (int) $row['day_of_week'],
                'start_time' => substr((string) $row['start_time'], 0, 5),
                'end_time' => substr((string) $row['end_time'], 0, 5),
            ], $hourRows),
        ]);
    }

    #[Route('/tenants/{tenantId}/staff/{staffId}/working-hours', methods: ['PUT'])]
    public function setWorkingHours(string $tenantId, string $staffId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $days = is_array($payload['days'] ?? null) ? $payload['days'] : [];

        $this->connection->beginTransaction();

        try {
            $this->connection->delete('working_hours', [
                'tenant_id' => $tenantId,
                'staff_id' => $staffId,
            ]);

            foreach ($days as $day) {
                if (!is_array($day) || !($day['is_open'] ?? false)) {
                    continue;
                }

                $this->connection->insert('working_hours', [
                    'id' => Uuid::v4()->toRfc4122(),
                    'tenant_id' => $tenantId,
                    'staff_id' => $staffId,
                    'day_of_week' => (int) ($day['day_of_week'] ?? 0),
                    'start_time' => substr((string) ($day['start_time'] ?? '09:00'), 0, 5),
                    'end_time' => substr((string) ($day['end_time'] ?? '18:00'), 0, 5),
                    'created_at' => $this->nowIso(),
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
            'working_hours.updated',
            'staff_member',
            $staffId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{tenantId}/products', methods: ['GET'])]
    public function productsOverview(string $tenantId): JsonResponse
    {
        $this->requireSuperadminUser();

        $products = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name, brand, category, price_sell, price_cost, sku, is_active
                FROM products
                WHERE tenant_id = :tenant_id
                ORDER BY name ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        $locations = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name
                FROM locations
                WHERE tenant_id = :tenant_id
                  AND is_active = TRUE
                ORDER BY name ASC
            SQL,
            ['tenant_id' => $tenantId],
        );

        $inventory = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT product_id, location_id, quantity, low_stock_threshold
                FROM product_inventory
                WHERE tenant_id = :tenant_id
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->json([
            'products' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'brand' => $row['brand'] !== null ? (string) $row['brand'] : null,
                'category' => $row['category'] !== null ? (string) $row['category'] : null,
                'price_sell' => (float) $row['price_sell'],
                'price_cost' => $row['price_cost'] !== null ? (float) $row['price_cost'] : null,
                'sku' => $row['sku'] !== null ? (string) $row['sku'] : null,
                'is_active' => $this->toBool($row['is_active'] ?? false),
            ], $products),
            'locations' => array_map(fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
            ], $locations),
            'inventory' => array_map(fn (array $row): array => [
                'product_id' => (string) $row['product_id'],
                'location_id' => (string) $row['location_id'],
                'quantity' => (int) $row['quantity'],
                'low_stock_threshold' => (int) $row['low_stock_threshold'],
            ], $inventory),
        ]);
    }

    #[Route('/tenants/{tenantId}/products', methods: ['POST'])]
    public function createProduct(string $tenantId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $productId = Uuid::v4()->toRfc4122();
        $now = $this->nowIso();

        $this->connection->beginTransaction();

        try {
            $this->connection->insert('products', [
                'id' => $productId,
                'tenant_id' => $tenantId,
                'name' => trim((string) ($payload['name'] ?? '')),
                'brand' => $this->nullableString($payload['brand'] ?? null),
                'category' => $this->nullableString($payload['category'] ?? null),
                'price_sell' => (float) ($payload['price_sell'] ?? 0),
                'price_cost' => $payload['price_cost'] === null || $payload['price_cost'] === ''
                    ? null
                    : (float) $payload['price_cost'],
                'sku' => $this->nullableString($payload['sku'] ?? null),
                'is_active' => array_key_exists('is_active', $payload) ? ((bool) $payload['is_active'] ? 1 : 0) : 1,
                'is_new' => 0,
                'created_by' => $currentUser->getId()->toRfc4122(),
                'created_at' => $now,
                'updated_at' => $now,
                'show_on_site' => 0,
            ]);

            $this->replaceProductInventory($tenantId, $productId, $payload['inventory'] ?? []);

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'product.created',
            'product',
            $productId,
            $tenantId,
        );

        return $this->json(['success' => true, 'id' => $productId], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{tenantId}/products/{productId}', methods: ['PATCH'])]
    public function updateProduct(string $tenantId, string $productId, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $updates = ['updated_at' => $this->nowIso()];

        foreach (['name', 'brand', 'category', 'sku'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $updates[$field] = $field === 'name'
                ? trim((string) $payload[$field])
                : $this->nullableString($payload[$field]);
        }

        foreach (['price_sell', 'price_cost'] as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $updates[$field] = $payload[$field] === null || $payload[$field] === ''
                ? null
                : (float) $payload[$field];
        }

        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }

        $this->connection->beginTransaction();

        try {
            $this->connection->update('products', $updates, [
                'id' => $productId,
                'tenant_id' => $tenantId,
            ]);

            if (array_key_exists('inventory', $payload)) {
                $this->replaceProductInventory($tenantId, $productId, $payload['inventory']);
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
            'product.updated',
            'product',
            $productId,
            $tenantId,
        );

        return $this->json(['success' => true]);
    }

    private function replaceProductInventory(string $tenantId, string $productId, mixed $inventory): void
    {
        $rows = is_array($inventory) ? $inventory : [];
        $this->connection->delete('product_inventory', [
            'tenant_id' => $tenantId,
            'product_id' => $productId,
        ]);

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $locationId = $this->nullableString($row['location_id'] ?? null);
            if ($locationId === null) {
                continue;
            }

            $this->connection->insert('product_inventory', [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $tenantId,
                'product_id' => $productId,
                'location_id' => $locationId,
                'quantity' => (int) ($row['quantity'] ?? 0),
                'low_stock_threshold' => (int) ($row['low_stock_threshold'] ?? 0),
                'updated_at' => $this->nowIso(),
            ]);
        }
    }

    private function requireSuperadminUser(): User
    {
        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($this->getUser());
    }

    private function toBool(mixed $value): bool
    {
        return $value === true || $value === 1 || $value === '1' || $value === 't';
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

    private function nowIso(): string
    {
        return (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
    }
}
