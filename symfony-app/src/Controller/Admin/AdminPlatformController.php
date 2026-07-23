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
final class AdminPlatformController extends AbstractController
{
    public function __construct(
        private readonly Connection $connection,
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly AdminAuditLogger $adminAuditLogger,
    ) {}

    #[Route('/bootstrap', methods: ['GET'])]
    public function bootstrap(): JsonResponse
    {
        $user = $this->requireSuperadminUser();

        return $this->json([
            'email' => $user->getEmail(),
            'counts' => [
                'tenants' => $this->fetchInt('SELECT COUNT(*) FROM tenants'),
                'users' => $this->fetchInt(
                    "SELECT COUNT(*) FROM profiles WHERE user_type = 'staff' OR is_superadmin = TRUE",
                ),
            ],
            'unreadNotifications' => $this->fetchInt(
                'SELECT COUNT(*) FROM platform_notifications WHERE is_read = FALSE',
            ),
        ]);
    }

    #[Route('/audit-log', methods: ['GET'])]
    public function auditLog(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        $limit = max(1, min(200, (int) $request->query->get('limit', 100)));
        $tenantId = $this->normalizeUuidString($request->query->get('tenantId'));

        $sql = <<<'SQL'
            SELECT id, actor_id, action, entity_type, entity_id, tenant_id, details, created_at
            FROM admin_audit_log
        SQL;
        $params = [];

        if ($tenantId !== null) {
            $sql .= ' WHERE tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }

        $sql .= ' ORDER BY created_at DESC LIMIT :limit';
        $params['limit'] = $limit;

        $rows = $this->connection->fetchAllAssociative($sql, $params, ['limit' => \PDO::PARAM_INT]);

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'actor_id' => $row['actor_id'] !== null ? (string) $row['actor_id'] : null,
                'action' => (string) $row['action'],
                'entity_type' => (string) $row['entity_type'],
                'entity_id' => $row['entity_id'] !== null ? (string) $row['entity_id'] : null,
                'tenant_id' => $row['tenant_id'] !== null ? (string) $row['tenant_id'] : null,
                'details' => $this->decodeJsonObject($row['details'] ?? null),
                'created_at' => $this->toIsoString($row['created_at']),
            ];
        }, $rows));
    }

    #[Route('/stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $this->requireSuperadminUser();

        $now = new \DateTimeImmutable('now');
        $d7 = $now->modify('-7 days');
        $d30 = $now->modify('-30 days');
        $d365 = $now->modify('-365 days');

        $tenants = $this->connection->fetchAllAssociative(
            'SELECT id, created_at, status FROM tenants ORDER BY created_at ASC',
        );

        $recentUsers = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT created_at
                FROM profiles
                WHERE (user_type = 'staff' OR is_superadmin = TRUE)
                  AND created_at >= :since
            SQL,
            ['since' => $d365->format(\DateTimeInterface::ATOM)],
        );

        $recentEvents = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, action, entity_type, created_at, details
                FROM admin_audit_log
                ORDER BY created_at DESC
                LIMIT 30
            SQL,
        );

        $subscriptions = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT sp.price_monthly
                FROM tenant_subscriptions ts
                LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
                WHERE ts.status = 'active'
            SQL,
        );

        $tenantCompleteness = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                    t.id,
                    COALESCE(s.services_count, 0) AS services_count,
                    COALESCE(w.hours_count, 0) AS hours_count,
                    COALESCE(l.locations_count, 0) AS locations_count
                FROM tenants t
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS services_count
                    FROM services
                    GROUP BY tenant_id
                ) s ON s.tenant_id = t.id
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS hours_count
                    FROM working_hours
                    GROUP BY tenant_id
                ) w ON w.tenant_id = t.id
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS locations_count
                    FROM locations
                    GROUP BY tenant_id
                ) l ON l.tenant_id = t.id
            SQL,
        );

        $ownerTenantIds = $this->connection->fetchFirstColumn(
            <<<'SQL'
                SELECT DISTINCT tenant_id
                FROM staff_members
                WHERE role = 'owner'
                  AND is_active = TRUE
                  AND deleted_at IS NULL
            SQL,
        );

        $growthMonths = [];
        for ($i = 11; $i >= 0; --$i) {
            $month = new \DateTimeImmutable(sprintf('%s-%s-01T00:00:00+00:00', $now->format('Y'), $now->format('m')));
            $month = $month->modify(sprintf('-%d months', $i));
            $growthMonths[] = [
                'key' => $month->format('Y-m'),
                'label' => $this->monthLabel($month),
            ];
        }

        $tenantsByMonth = [];
        $activeTenants = 0;
        $suspendedTenants = 0;

        foreach ($tenants as $tenant) {
            $createdAt = new \DateTimeImmutable((string) $tenant['created_at']);
            $key = $createdAt->format('Y-m');
            $tenantsByMonth[$key] = ($tenantsByMonth[$key] ?? 0) + 1;

            $status = (string) ($tenant['status'] ?? '');
            if ($status === 'active') {
                ++$activeTenants;
            } elseif ($status === 'suspended') {
                ++$suspendedTenants;
            }
        }

        $usersByMonth = [];
        $newSignups30d = 0;

        foreach ($recentUsers as $row) {
            $createdAt = new \DateTimeImmutable((string) $row['created_at']);
            $key = $createdAt->format('Y-m');
            $usersByMonth[$key] = ($usersByMonth[$key] ?? 0) + 1;

            if ($createdAt >= $d30) {
                ++$newSignups30d;
            }
        }

        $baselineThreshold = new \DateTimeImmutable($growthMonths[0]['key'].'-01T00:00:00+00:00');
        $baseline = 0;
        foreach ($tenants as $tenant) {
            if (new \DateTimeImmutable((string) $tenant['created_at']) < $baselineThreshold) {
                ++$baseline;
            }
        }

        $growth = [];
        $cumulative = $baseline;
        foreach ($growthMonths as $month) {
            $cumulative += $tenantsByMonth[$month['key']] ?? 0;
            $growth[] = [
                'month' => $month['label'],
                'count' => $cumulative,
            ];
        }

        $signups = array_map(static function (array $month) use ($usersByMonth): array {
            return [
                'month' => $month['label'],
                'count' => $usersByMonth[$month['key']] ?? 0,
            ];
        }, $growthMonths);

        $mrr = 0.0;
        foreach ($subscriptions as $subscription) {
            $mrr += (float) ($subscription['price_monthly'] ?? 0);
        }

        $tenantsWithoutServices = 0;
        $tenantsWithoutHours = 0;
        $tenantsWithoutLocations = 0;

        foreach ($tenantCompleteness as $row) {
            if ((int) $row['services_count'] === 0) {
                ++$tenantsWithoutServices;
            }
            if ((int) $row['hours_count'] === 0) {
                ++$tenantsWithoutHours;
            }
            if ((int) $row['locations_count'] === 0) {
                ++$tenantsWithoutLocations;
            }
        }

        $ownerTenantLookup = array_fill_keys(array_map('strval', $ownerTenantIds), true);
        $tenantsWithoutOwner = 0;
        foreach ($tenants as $tenant) {
            if (!isset($ownerTenantLookup[(string) $tenant['id']])) {
                ++$tenantsWithoutOwner;
            }
        }

        return $this->json([
            'total_tenants' => count($tenants),
            'active_tenants' => $activeTenants,
            'suspended_tenants' => $suspendedTenants,
            'total_staff' => $this->fetchInt(
                "SELECT COUNT(*) FROM profiles WHERE user_type = 'staff' OR is_superadmin = TRUE",
            ),
            'new_signups_7d' => $this->fetchInt(
                <<<'SQL'
                    SELECT COUNT(*)
                    FROM profiles
                    WHERE (user_type = 'staff' OR is_superadmin = TRUE)
                      AND created_at >= :since
                SQL,
                ['since' => $d7->format(\DateTimeInterface::ATOM)],
            ),
            'new_signups_30d' => $newSignups30d,
            'total_services' => $this->fetchInt('SELECT COUNT(*) FROM services'),
            'total_plans' => $this->fetchInt('SELECT COUNT(*) FROM subscription_plans'),
            'mrr' => $mrr,
            'tenants_without_services' => $tenantsWithoutServices,
            'tenants_without_hours' => $tenantsWithoutHours,
            'tenants_without_locations' => $tenantsWithoutLocations,
            'tenants_without_owner' => $tenantsWithoutOwner,
            'growth_by_month' => $growth,
            'signups_by_month' => $signups,
            'recent_events' => array_map(function (array $row): array {
                return [
                    'id' => (string) $row['id'],
                    'action' => (string) $row['action'],
                    'entity_type' => (string) $row['entity_type'],
                    'created_at' => $this->toIsoString($row['created_at']),
                    'details' => $this->decodeJsonObject($row['details'] ?? null),
                ];
            }, $recentEvents),
        ]);
    }

    #[Route('/global-overview', methods: ['GET'])]
    public function globalOverview(): JsonResponse
    {
        $this->requireSuperadminUser();

        $d30 = (new \DateTimeImmutable('now'))->modify('-30 days');

        $payments = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT tenant_id, amount
                FROM payments
                WHERE status IN ('paid', 'completed')
            SQL,
        );

        $appointments = $this->connection->fetchAllAssociative(
            'SELECT tenant_id FROM appointments WHERE start_time >= :since',
            ['since' => $d30->format(\DateTimeInterface::ATOM)],
        );

        $tenants = $this->connection->fetchAllAssociative(
            'SELECT id, business_name, logo_url, primary_color, status FROM tenants',
        );

        $revenueByTenant = [];
        $totalRevenue = 0.0;
        foreach ($payments as $payment) {
            $tenantId = (string) $payment['tenant_id'];
            $amount = (float) ($payment['amount'] ?? 0);
            $totalRevenue += $amount;
            $revenueByTenant[$tenantId] = ($revenueByTenant[$tenantId] ?? 0) + $amount;
        }

        $appointmentsByTenant = [];
        foreach ($appointments as $appointment) {
            $tenantId = (string) $appointment['tenant_id'];
            $appointmentsByTenant[$tenantId] = ($appointmentsByTenant[$tenantId] ?? 0) + 1;
        }

        $tenantMap = [];
        $activeTenants = 0;
        foreach ($tenants as $tenant) {
            $tenantMap[(string) $tenant['id']] = $tenant;
            if ((string) ($tenant['status'] ?? '') === 'active') {
                ++$activeTenants;
            }
        }

        $topTenants = [];
        foreach ($revenueByTenant as $tenantId => $revenue) {
            $tenant = $tenantMap[$tenantId] ?? null;
            $topTenants[] = [
                'id' => $tenantId,
                'business_name' => (string) ($tenant['business_name'] ?? '—'),
                'logo_url' => $tenant['logo_url'] !== null ? (string) $tenant['logo_url'] : null,
                'primary_color' => $tenant['primary_color'] !== null ? (string) $tenant['primary_color'] : null,
                'total_revenue' => $revenue,
                'appointments_30d' => $appointmentsByTenant[$tenantId] ?? 0,
            ];
        }

        usort($topTenants, static fn (array $left, array $right): int => $right['total_revenue'] <=> $left['total_revenue']);

        return $this->json([
            'total_revenue' => $totalRevenue,
            'active_tenants' => $activeTenants,
            'appointments_30d' => count($appointments),
            'top_tenants' => array_slice($topTenants, 0, 5),
        ]);
    }

    #[Route('/settings', methods: ['GET'])]
    public function settings(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        $keys = $request->query->all('keys');
        if ($keys === []) {
            $csv = trim((string) $request->query->get('keys', ''));
            if ($csv !== '') {
                $keys = array_values(array_filter(array_map('trim', explode(',', $csv))));
            }
        }

        if ($keys === []) {
            return $this->json([]);
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT key, value FROM admin_settings WHERE key IN (:keys)',
            ['keys' => $keys],
            ['keys' => Connection::PARAM_STR_ARRAY],
        );

        $settings = [];
        foreach ($rows as $row) {
            $settings[(string) $row['key']] = $this->decodeJsonObject($row['value'] ?? null);
        }

        return $this->json($settings);
    }

    #[Route('/settings/{key}', methods: ['PUT'])]
    public function setSetting(string $key, Request $request): JsonResponse
    {
        $user = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $value = isset($payload['value']) && is_array($payload['value']) ? $payload['value'] : [];

        $exists = $this->connection->fetchOne(
            'SELECT 1 FROM admin_settings WHERE key = :key',
            ['key' => $key],
        );

        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
        if ($exists) {
            $this->connection->update('admin_settings', [
                'value' => json_encode($value, \JSON_THROW_ON_ERROR),
                'updated_at' => $now,
                'updated_by' => $user->getId()->toRfc4122(),
            ], ['key' => $key]);
        } else {
            $this->connection->insert('admin_settings', [
                'key' => $key,
                'value' => json_encode($value, \JSON_THROW_ON_ERROR),
                'updated_at' => $now,
                'updated_by' => $user->getId()->toRfc4122(),
            ]);
        }

        $this->adminAuditLogger->log(
            $user->getId()->toRfc4122(),
            'settings.updated',
            'settings',
            $key,
            null,
            ['value' => $value],
        );

        return $this->json(['success' => true]);
    }

    #[Route('/email-templates', methods: ['GET'])]
    public function emailTemplates(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, slug, name, subject, body, variables, is_active FROM email_templates ORDER BY slug ASC',
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'slug' => (string) $row['slug'],
                'name' => (string) $row['name'],
                'subject' => (string) $row['subject'],
                'body' => (string) $row['body'],
                'variables' => $this->decodeJsonStringList($row['variables'] ?? null),
                'is_active' => $this->toBool($row['is_active'] ?? false),
            ];
        }, $rows));
    }

    #[Route('/email-templates/{id}', methods: ['PATCH'])]
    public function updateEmailTemplate(string $id, Request $request): JsonResponse
    {
        $user = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $updates = [];
        if (array_key_exists('name', $payload)) {
            $updates['name'] = $payload['name'];
        }
        if (array_key_exists('subject', $payload)) {
            $updates['subject'] = $payload['subject'];
        }
        if (array_key_exists('body', $payload)) {
            $updates['body'] = $payload['body'];
        }
        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }
        $updates['updated_at'] = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        if ($updates !== []) {
            $this->connection->update('email_templates', $updates, ['id' => $id]);
        }

        $this->adminAuditLogger->log(
            $user->getId()->toRfc4122(),
            'email_template.updated',
            'email_template',
            $id,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        $query = trim((string) $request->query->get('q', ''));
        if ($query === '') {
            return $this->json([
                'tenants' => [],
                'users' => [],
                'services' => [],
            ]);
        }

        $like = '%'.$query.'%';

        $tenants = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, business_name, slug
                FROM tenants
                WHERE business_name ILIKE :query OR slug ILIKE :query
                ORDER BY business_name ASC
                LIMIT 8
            SQL,
            ['query' => $like],
        );

        $users = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT p.id, p.full_name, u.email
                FROM profiles p
                INNER JOIN users u ON u.id = p.id
                WHERE (p.user_type = 'staff' OR p.is_superadmin = TRUE)
                  AND (p.full_name ILIKE :query OR u.email ILIKE :query)
                ORDER BY COALESCE(p.full_name, u.email) ASC
                LIMIT 8
            SQL,
            ['query' => $like],
        );

        $services = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT s.id, s.name, s.tenant_id, t.business_name AS tenant_name
                FROM services s
                INNER JOIN tenants t ON t.id = s.tenant_id
                WHERE s.name ILIKE :query
                ORDER BY s.name ASC
                LIMIT 8
            SQL,
            ['query' => $like],
        );

        return $this->json([
            'tenants' => array_map(static fn (array $row): array => [
                'id' => (string) $row['id'],
                'business_name' => (string) $row['business_name'],
                'slug' => (string) $row['slug'],
            ], $tenants),
            'users' => array_map(static fn (array $row): array => [
                'id' => (string) $row['id'],
                'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                'email' => $row['email'] !== null ? (string) $row['email'] : null,
            ], $users),
            'services' => array_map(static fn (array $row): array => [
                'id' => (string) $row['id'],
                'name' => (string) $row['name'],
                'tenant_id' => (string) $row['tenant_id'],
                'tenant_name' => (string) $row['tenant_name'],
            ], $services),
        ]);
    }

    #[Route('/notifications', methods: ['GET'])]
    public function notifications(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, type, title, body, tenant_id, related_profile_id, meta, is_read, created_at
                FROM platform_notifications
                ORDER BY created_at DESC
                LIMIT 20
            SQL,
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'type' => (string) $row['type'],
                'title' => (string) $row['title'],
                'body' => $row['body'] !== null ? (string) $row['body'] : null,
                'tenant_id' => $row['tenant_id'] !== null ? (string) $row['tenant_id'] : null,
                'related_profile_id' => $row['related_profile_id'] !== null ? (string) $row['related_profile_id'] : null,
                'meta' => $this->decodeJsonObject($row['meta'] ?? null),
                'is_read' => $this->toBool($row['is_read'] ?? false),
                'created_at' => $this->toIsoString($row['created_at']),
            ];
        }, $rows));
    }

    #[Route('/notifications/unread-count', methods: ['GET'])]
    public function unreadNotificationsCount(): JsonResponse
    {
        $this->requireSuperadminUser();

        return $this->json([
            'count' => $this->fetchInt(
                'SELECT COUNT(*) FROM platform_notifications WHERE is_read = FALSE',
            ),
        ]);
    }

    #[Route('/notifications/{id}/read', methods: ['POST'])]
    public function markNotificationRead(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $this->connection->update('platform_notifications', ['is_read' => true], ['id' => $id]);

        return $this->json(['ok' => true]);
    }

    #[Route('/notifications/read-all', methods: ['POST'])]
    public function markAllNotificationsRead(): JsonResponse
    {
        $this->requireSuperadminUser();

        $this->connection->executeStatement(
            'UPDATE platform_notifications SET is_read = TRUE WHERE is_read = FALSE',
        );

        return $this->json(['ok' => true]);
    }

    #[Route('/plans', methods: ['GET'])]
    public function plans(): JsonResponse
    {
        $this->requireSuperadminUser();

        $planRows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, name, slug, price_monthly, max_locations, max_staff, feature_flags, is_active
                FROM subscription_plans
                ORDER BY price_monthly ASC NULLS FIRST, name ASC
            SQL,
        );

        $subscriptionRows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT plan_id
                FROM tenant_subscriptions
                WHERE status = 'active'
            SQL,
        );

        $counts = [];
        foreach ($subscriptionRows as $row) {
            if (!isset($row['plan_id'])) {
                continue;
            }

            $planId = (string) $row['plan_id'];
            $counts[$planId] = ($counts[$planId] ?? 0) + 1;
        }

        $plans = [];
        $mrr = 0.0;
        $activeTenantsTotal = 0;

        foreach ($planRows as $row) {
            $planId = (string) $row['id'];
            $activeTenantCount = $counts[$planId] ?? 0;
            $priceMonthly = (float) ($row['price_monthly'] ?? 0);
            $mrr += $priceMonthly * $activeTenantCount;
            $activeTenantsTotal += $activeTenantCount;

            $plans[] = [
                'id' => $planId,
                'name' => (string) $row['name'],
                'slug' => (string) $row['slug'],
                'price_monthly' => $priceMonthly,
                'max_locations' => isset($row['max_locations']) ? (int) $row['max_locations'] : null,
                'max_staff' => isset($row['max_staff']) ? (int) $row['max_staff'] : null,
                'feature_flags' => $this->decodeJsonObject($row['feature_flags'] ?? null),
                'is_active' => $this->toBool($row['is_active'] ?? false),
                'active_tenants_count' => $activeTenantCount,
            ];
        }

        return $this->json([
            'plans' => $plans,
            'mrr' => $mrr,
            'active_tenants_total' => $activeTenantsTotal,
        ]);
    }

    #[Route('/plans/options', methods: ['GET'])]
    public function planOptions(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, name, price_monthly FROM subscription_plans ORDER BY price_monthly ASC NULLS FIRST, name ASC',
        );

        return $this->json(array_map(static fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'price_monthly' => $row['price_monthly'] !== null ? (float) $row['price_monthly'] : null,
        ], $rows));
    }

    #[Route('/plans', methods: ['POST'])]
    public function createPlan(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();
        $payload = $request->toArray();

        $id = Uuid::v4()->toRfc4122();
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        $this->connection->insert('subscription_plans', [
            'id' => $id,
            'name' => (string) ($payload['name'] ?? ''),
            'slug' => (string) ($payload['slug'] ?? ''),
            'price_monthly' => (float) ($payload['price_monthly'] ?? 0),
            'max_locations' => isset($payload['max_locations']) ? (int) $payload['max_locations'] : null,
            'max_staff' => isset($payload['max_staff']) ? (int) $payload['max_staff'] : null,
            'feature_flags' => json_encode(
                isset($payload['feature_flags']) && is_array($payload['feature_flags']) ? $payload['feature_flags'] : [],
                \JSON_THROW_ON_ERROR,
            ),
            'is_active' => array_key_exists('is_active', $payload) ? (bool) $payload['is_active'] : true,
            'created_at' => $now,
        ]);

        return $this->json(['success' => true, 'id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/plans/{id}', methods: ['PATCH'])]
    public function updatePlan(string $id, Request $request): JsonResponse
    {
        $this->requireSuperadminUser();
        $payload = $request->toArray();

        $updates = [];
        foreach (['name', 'slug'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = $payload[$field];
            }
        }
        foreach (['price_monthly'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = (float) $payload[$field];
            }
        }
        foreach (['max_locations', 'max_staff'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = $payload[$field] === null ? null : (int) $payload[$field];
            }
        }
        if (array_key_exists('feature_flags', $payload)) {
            $updates['feature_flags'] = json_encode(
                is_array($payload['feature_flags']) ? $payload['feature_flags'] : [],
                \JSON_THROW_ON_ERROR,
            );
        }
        if (array_key_exists('is_active', $payload)) {
            $updates['is_active'] = (bool) $payload['is_active'];
        }

        $this->connection->update('subscription_plans', $updates, ['id' => $id]);

        return $this->json(['success' => true]);
    }

    #[Route('/plans/{id}', methods: ['DELETE'])]
    public function deletePlan(string $id): JsonResponse
    {
        $this->requireSuperadminUser();
        $this->connection->delete('subscription_plans', ['id' => $id]);

        return $this->json(['success' => true]);
    }

    #[Route('/plans/{id}/tenants', methods: ['GET'])]
    public function tenantsOnPlan(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT t.id, t.business_name, t.status, ts.current_period_start
                FROM tenant_subscriptions ts
                INNER JOIN tenants t ON t.id = ts.tenant_id
                WHERE ts.plan_id = :plan_id
                  AND ts.status = 'active'
                ORDER BY t.business_name ASC
            SQL,
            ['plan_id' => $id],
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'business_name' => (string) $row['business_name'],
                'status' => (string) $row['status'],
                'starts_at' => $row['current_period_start'] !== null ? $this->toIsoString($row['current_period_start']) : null,
            ];
        }, $rows));
    }

    #[Route('/onboarding-tokens', methods: ['GET'])]
    public function onboardingTokens(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, token, barbiere_email, created_by, created_at, expires_at, used_at, used_by_email, active
                FROM onboarding_tokens
                ORDER BY created_at DESC
                LIMIT 100
            SQL,
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'token' => (string) $row['token'],
                'barbiere_email' => $row['barbiere_email'] !== null ? (string) $row['barbiere_email'] : null,
                'created_by' => $row['created_by'] !== null ? (string) $row['created_by'] : null,
                'created_at' => $this->toIsoString($row['created_at']),
                'expires_at' => $this->toIsoString($row['expires_at']),
                'used_at' => $row['used_at'] !== null ? $this->toIsoString($row['used_at']) : null,
                'used_by_email' => $row['used_by_email'] !== null ? (string) $row['used_by_email'] : null,
                'active' => $this->toBool($row['active'] ?? false),
            ];
        }, $rows));
    }

    #[Route('/onboarding-tokens', methods: ['POST'])]
    public function createOnboardingToken(Request $request): JsonResponse
    {
        $user = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $email = isset($payload['barbiere_email']) && is_string($payload['barbiere_email'])
            ? trim(mb_strtolower($payload['barbiere_email']))
            : null;

        $token = bin2hex(random_bytes(16));
        $id = Uuid::v4()->toRfc4122();
        $createdAt = new \DateTimeImmutable();
        $expiresAt = $createdAt->modify('+30 days');

        $this->connection->insert('onboarding_tokens', [
            'id' => $id,
            'token' => $token,
            'barbiere_email' => $email !== '' ? $email : null,
            'created_by' => $user->getId()->toRfc4122(),
            'created_at' => $createdAt->format(\DateTimeInterface::ATOM),
            'expires_at' => $expiresAt->format(\DateTimeInterface::ATOM),
            'active' => true,
        ]);

        return $this->json([
            'id' => $id,
            'token' => $token,
            'barbiere_email' => $email !== '' ? $email : null,
            'created_by' => $user->getId()->toRfc4122(),
            'created_at' => $createdAt->format(\DateTimeInterface::ATOM),
            'expires_at' => $expiresAt->format(\DateTimeInterface::ATOM),
            'used_at' => null,
            'used_by_email' => null,
            'active' => true,
        ], Response::HTTP_CREATED);
    }

    #[Route('/onboarding-tokens/{id}', methods: ['DELETE'])]
    public function deleteOnboardingToken(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $usedAt = $this->connection->fetchOne(
            'SELECT used_at FROM onboarding_tokens WHERE id = :id',
            ['id' => $id],
        );

        if ($usedAt !== false && $usedAt !== null) {
            return $this->json(
                ['error' => 'Token già usato, impossibile eliminarlo.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $this->connection->delete('onboarding_tokens', ['id' => $id]);

        return $this->json(['success' => true]);
    }

    private function requireSuperadminUser(): User
    {
        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($this->getUser());
    }

    /**
     * @param array<string, mixed> $params
     */
    private function fetchInt(string $sql, array $params = []): int
    {
        return (int) $this->connection->fetchOne($sql, $params);
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

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonObject(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        try {
            $decoded = json_decode($value, true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return list<string>
     */
    private function decodeJsonStringList(mixed $value): array
    {
        $decoded = $this->decodeJsonObject($value);

        return array_values(array_filter(
            $decoded,
            static fn (mixed $entry): bool => is_string($entry) && trim($entry) !== '',
        ));
    }

    private function monthLabel(\DateTimeImmutable $month): string
    {
        $labels = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

        return sprintf('%s %s', $labels[((int) $month->format('n')) - 1], $month->format('y'));
    }

    private function normalizeUuidString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '' || !Uuid::isValid($trimmed)) {
            return null;
        }

        return $trimmed;
    }
}
