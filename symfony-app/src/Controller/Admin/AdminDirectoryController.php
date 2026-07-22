<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Security\SuperadminAccessChecker;
use App\Service\AdminAuditLogger;
use App\Service\PasswordResetService;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/admin')]
final class AdminDirectoryController extends AbstractController
{
    public function __construct(
        private readonly Connection $connection,
        private readonly EntityManagerInterface $em,
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly PasswordResetService $passwordResetService,
        private readonly AdminAuditLogger $adminAuditLogger,
    ) {}

    #[Route('/users', methods: ['GET'])]
    public function users(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT p.id, p.full_name, COALESCE(p.email, u.email) AS email, p.is_superadmin, p.onboarding_completed, p.created_at
                FROM profiles p
                INNER JOIN users u ON u.id = p.id
                WHERE p.is_superadmin = TRUE
                ORDER BY p.created_at DESC
            SQL,
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'full_name' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
                'email' => $row['email'] !== null ? (string) $row['email'] : null,
                'is_superadmin' => $this->toBool($row['is_superadmin'] ?? false),
                'onboarding_completed' => $this->toBool($row['onboarding_completed'] ?? false),
                'created_at' => $this->toIsoString($row['created_at']),
            ];
        }, $rows));
    }

    #[Route('/users/{id}', methods: ['PATCH'])]
    public function updateUser(string $id, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $updates = [];
        if (array_key_exists('full_name', $payload)) {
            $updates['full_name'] = $payload['full_name'];
        }
        if (array_key_exists('is_superadmin', $payload)) {
            $updates['is_superadmin'] = (bool) $payload['is_superadmin'];
        }

        if ($updates !== []) {
            $this->connection->update('profiles', $updates, ['id' => $id]);
        }

        if (array_key_exists('is_superadmin', $payload)) {
            $user = $this->loadUserById($id);
            if (!$user instanceof User) {
                return $this->json(['error' => 'Utente non trovato.'], Response::HTTP_NOT_FOUND);
            }

            $roles = $user->getRoles();
            if ((bool) $payload['is_superadmin']) {
                $roles[] = 'ROLE_SUPERADMIN';
            } else {
                $roles = array_values(array_filter(
                    $roles,
                    static fn (string $role): bool => $role !== 'ROLE_SUPERADMIN',
                ));
            }
            $user->setRoles(array_values(array_unique($roles)));
            $this->em->flush();
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'user.updated',
            'user',
            $id,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/users/{id}', methods: ['DELETE'])]
    public function deleteUser(string $id): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        if ($currentUser->getId()->toRfc4122() === $id) {
            return $this->json(['error' => 'Non puoi eliminare te stesso.'], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->loadUserById($id);
        if (!$user instanceof User) {
            return $this->json(['error' => 'Utente non trovato.'], Response::HTTP_NOT_FOUND);
        }

        $this->connection->beginTransaction();

        try {
            $this->connection->executeStatement('UPDATE appointments SET booked_by = NULL WHERE booked_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE appointments SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE appointments SET deleted_by = NULL WHERE deleted_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE clients SET profile_id = NULL WHERE profile_id = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE clients SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE clients SET deleted_by = NULL WHERE deleted_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE payments SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE products SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE services SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE rewards SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE staff_members SET created_by = NULL WHERE created_by = :id', ['id' => $id]);
            $this->connection->executeStatement('UPDATE staff_members SET deleted_by = NULL WHERE deleted_by = :id', ['id' => $id]);
            $this->connection->delete('staff_members', ['profile_id' => $id]);

            $this->em->remove($user);
            $this->em->flush();

            $this->connection->commit();
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'user.deleted',
            'user',
            $id,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/users/invite', methods: ['POST'])]
    public function inviteUser(Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $fullName = trim((string) ($payload['fullName'] ?? ''));
        $isSuperadmin = (bool) ($payload['isSuperadmin'] ?? false);
        $tenantId = $this->normalizeUuidString($payload['tenantId'] ?? null);
        $role = $this->normalizeMembershipRole((string) ($payload['role'] ?? 'staff'));

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Email non valida.'], Response::HTTP_BAD_REQUEST);
        }

        if ($this->connection->fetchOne('SELECT 1 FROM users WHERE email = :email', ['email' => $email])) {
            return $this->json(['error' => 'Email già in uso.'], Response::HTTP_CONFLICT);
        }

        $id = Uuid::v4()->toRfc4122();
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
        $seedPassword = bin2hex(random_bytes(24));

        $user = (new User())
            ->setEmail($email)
            ->setRoles(array_values(array_unique(array_filter([
                'ROLE_STAFF',
                $isSuperadmin ? 'ROLE_SUPERADMIN' : null,
            ]))));
        $user->setPassword($this->passwordHasher->hashPassword($user, $seedPassword));

        $this->connection->beginTransaction();

        try {
            $this->em->persist($user);
            $this->em->flush();

            $this->connection->update('profiles', [
                'email' => $email,
                'full_name' => $fullName !== '' ? $fullName : null,
                'user_type' => 'staff',
                'is_superadmin' => $isSuperadmin,
                'onboarding_completed' => false,
            ], ['id' => $user->getId()->toRfc4122()]);

            if ($tenantId !== null) {
                $existingMembershipId = $this->connection->fetchOne(
                    <<<'SQL'
                        SELECT id
                        FROM staff_members
                        WHERE tenant_id = :tenant_id
                          AND profile_id = :profile_id
                        LIMIT 1
                    SQL,
                    [
                        'tenant_id' => $tenantId,
                        'profile_id' => $user->getId()->toRfc4122(),
                    ],
                );

                if ($existingMembershipId) {
                    $this->connection->update('staff_members', [
                        'role' => $role,
                        'is_active' => true,
                        'deleted_at' => null,
                    ], ['id' => $existingMembershipId]);
                } else {
                    $this->connection->insert('staff_members', [
                        'id' => Uuid::v4()->toRfc4122(),
                        'tenant_id' => $tenantId,
                        'profile_id' => $user->getId()->toRfc4122(),
                        'role' => $role,
                        'is_active' => true,
                        'notification_preferences' => json_encode([], \JSON_THROW_ON_ERROR),
                        'created_at' => $now,
                        'updated_at' => $now,
                        'show_on_website' => false,
                    ]);
                }
            }

            $setupLink = $this->passwordResetService->issueResetLinkForUser($user);

            $this->connection->commit();

            $this->adminAuditLogger->log(
                $currentUser->getId()->toRfc4122(),
                'user.invited',
                'user',
                $user->getId()->toRfc4122(),
                $tenantId,
                [
                    'email' => $email,
                    'is_superadmin' => $isSuperadmin,
                ],
            );

            return $this->json([
                'success' => true,
                'userId' => $user->getId()->toRfc4122(),
                'setupLink' => $setupLink,
            ], Response::HTTP_CREATED);
        } catch (UniqueConstraintViolationException) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            return $this->json(['error' => 'Email già in uso.'], Response::HTTP_CONFLICT);
        } catch (\Throwable $exception) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $exception;
        }
    }

    #[Route('/users/{id}/password-reset', methods: ['POST'])]
    public function resetUserPassword(string $id): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $user = $this->loadUserById($id);
        if (!$user instanceof User) {
            return $this->json(['error' => 'Utente non trovato.'], Response::HTTP_NOT_FOUND);
        }

        $tempPassword = sprintf(
            'Styll-%s-%s',
            substr(bin2hex(random_bytes(8)), 0, 8),
            substr(bin2hex(random_bytes(4)), 0, 4),
        );
        $user->setPassword($this->passwordHasher->hashPassword($user, $tempPassword));
        $this->em->flush();

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'user.password_reset',
            'user',
            $id,
        );

        return $this->json([
            'success' => true,
            'tempPassword' => $tempPassword,
        ]);
    }

    #[Route('/users/{id}/tenants', methods: ['GET'])]
    public function userTenants(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT sm.id AS staff_id, sm.role, sm.is_active, t.id AS tenant_id, t.business_name, t.slug
                FROM staff_members sm
                INNER JOIN tenants t ON t.id = sm.tenant_id
                WHERE sm.profile_id = :profile_id
                ORDER BY sm.created_at ASC
            SQL,
            ['profile_id' => $id],
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'staff_id' => (string) $row['staff_id'],
                'role' => (string) $row['role'],
                'is_active' => $this->toBool($row['is_active'] ?? false),
                'tenant' => [
                    'id' => (string) $row['tenant_id'],
                    'business_name' => (string) $row['business_name'],
                    'slug' => (string) $row['slug'],
                ],
            ];
        }, $rows));
    }

    #[Route('/users/{id}/impersonation-context', methods: ['GET'])]
    public function userImpersonationContext(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $row = $this->connection->fetchAssociative(
            <<<'SQL'
                SELECT sm.tenant_id, t.business_name, t.slug
                FROM staff_members sm
                INNER JOIN tenants t ON t.id = sm.tenant_id
                WHERE sm.profile_id = :profile_id
                  AND sm.is_active = TRUE
                ORDER BY sm.created_at ASC
                LIMIT 1
            SQL,
            ['profile_id' => $id],
        );

        if (!is_array($row)) {
            return $this->json(
                ['error' => "L'utente non ha un tenant attivo da impersonare."],
                Response::HTTP_BAD_REQUEST,
            );
        }

        return $this->json([
            'tenantId' => (string) $row['tenant_id'],
            'tenantName' => (string) $row['business_name'],
            'tenantSlug' => (string) $row['slug'],
        ]);
    }

    #[Route('/tenants', methods: ['GET'])]
    public function tenants(): JsonResponse
    {
        $this->requireSuperadminUser();

        $rows = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT
                    t.id,
                    t.business_name,
                    t.slug,
                    t.status,
                    t.timezone,
                    t.primary_color,
                    t.secondary_color,
                    t.logo_url,
                    t.font_family,
                    t.settings,
                    t.created_at,
                    COALESCE(s.services_count, 0) AS services_count,
                    COALESCE(sm.staff_count, 0) AS staff_count,
                    COALESCE(sm.active_staff_count, 0) AS active_staff_count,
                    COALESCE(l.locations_count, 0) AS locations_count,
                    COALESCE(c.clients_count, 0) AS clients_count,
                    ts.plan_id,
                    sp.name AS plan_name,
                    ts.status AS subscription_status
                FROM tenants t
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS services_count
                    FROM services
                    GROUP BY tenant_id
                ) s ON s.tenant_id = t.id
                LEFT JOIN (
                    SELECT
                        tenant_id,
                        COUNT(*) AS staff_count,
                        COUNT(*) FILTER (WHERE is_active = TRUE) AS active_staff_count
                    FROM staff_members
                    GROUP BY tenant_id
                ) sm ON sm.tenant_id = t.id
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS locations_count
                    FROM locations
                    GROUP BY tenant_id
                ) l ON l.tenant_id = t.id
                LEFT JOIN (
                    SELECT tenant_id, COUNT(*) AS clients_count
                    FROM clients
                    WHERE deleted_at IS NULL
                    GROUP BY tenant_id
                ) c ON c.tenant_id = t.id
                LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.id
                LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
                ORDER BY t.created_at DESC
            SQL,
        );

        return $this->json(array_map(function (array $row): array {
            return [
                'id' => (string) $row['id'],
                'business_name' => (string) $row['business_name'],
                'slug' => (string) $row['slug'],
                'status' => (string) $row['status'],
                'timezone' => (string) $row['timezone'],
                'primary_color' => $row['primary_color'] !== null ? (string) $row['primary_color'] : null,
                'secondary_color' => $row['secondary_color'] !== null ? (string) $row['secondary_color'] : null,
                'logo_url' => $row['logo_url'] !== null ? (string) $row['logo_url'] : null,
                'font_family' => $row['font_family'] !== null ? (string) $row['font_family'] : null,
                'settings' => $this->decodeJsonObject($row['settings'] ?? null),
                'created_at' => $this->toIsoString($row['created_at']),
                'services_count' => (int) $row['services_count'],
                'staff_count' => (int) $row['staff_count'],
                'active_staff_count' => (int) $row['active_staff_count'],
                'locations_count' => (int) $row['locations_count'],
                'clients_count' => (int) $row['clients_count'],
                'plan_id' => $row['plan_id'] !== null ? (string) $row['plan_id'] : null,
                'plan_name' => $row['plan_name'] !== null ? (string) $row['plan_name'] : null,
                'subscription_status' => $row['subscription_status'] !== null ? (string) $row['subscription_status'] : null,
            ];
        }, $rows));
    }

    #[Route('/tenants', methods: ['POST'])]
    public function createTenant(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();
        $payload = $request->toArray();
        $id = Uuid::v4()->toRfc4122();
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        $this->connection->insert('tenants', [
            'id' => $id,
            'business_name' => (string) ($payload['business_name'] ?? ''),
            'slug' => (string) ($payload['slug'] ?? ''),
            'timezone' => (string) ($payload['timezone'] ?? 'Europe/Rome'),
            'status' => (string) ($payload['status'] ?? 'active'),
            'primary_color' => $payload['primary_color'] ?? null,
            'secondary_color' => $payload['secondary_color'] ?? null,
            'logo_url' => $payload['logo_url'] ?? null,
            'font_family' => $payload['font_family'] ?? null,
            'settings' => json_encode(
                isset($payload['settings']) && is_array($payload['settings']) ? $payload['settings'] : [],
                \JSON_THROW_ON_ERROR,
            ),
            'feature_flag_overrides' => json_encode([], \JSON_THROW_ON_ERROR),
            'data_region' => 'eu-west-1',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $this->json(['success' => true, 'id' => $id], Response::HTTP_CREATED);
    }

    #[Route('/tenants/{id}', methods: ['GET'])]
    public function tenantDetail(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $row = $this->connection->fetchAssociative(
            <<<'SQL'
                SELECT
                    t.*,
                    COALESCE(s.services_count, 0) AS services_count,
                    COALESCE(sm.staff_count, 0) AS staff_count,
                    COALESCE(l.locations_count, 0) AS locations_count,
                    COALESCE(c.clients_count, 0) AS clients_count,
                    COALESCE(a.appointments_count, 0) AS appointments_count,
                    ts.plan_id,
                    ts.status AS subscription_status,
                    ts.current_period_start,
                    ts.current_period_end,
                    sp.name AS plan_name,
                    sp.price_monthly
                FROM tenants t
                LEFT JOIN (SELECT tenant_id, COUNT(*) AS services_count FROM services GROUP BY tenant_id) s ON s.tenant_id = t.id
                LEFT JOIN (SELECT tenant_id, COUNT(*) AS staff_count FROM staff_members GROUP BY tenant_id) sm ON sm.tenant_id = t.id
                LEFT JOIN (SELECT tenant_id, COUNT(*) AS locations_count FROM locations GROUP BY tenant_id) l ON l.tenant_id = t.id
                LEFT JOIN (SELECT tenant_id, COUNT(*) AS clients_count FROM clients WHERE deleted_at IS NULL GROUP BY tenant_id) c ON c.tenant_id = t.id
                LEFT JOIN (SELECT tenant_id, COUNT(*) AS appointments_count FROM appointments WHERE deleted_at IS NULL GROUP BY tenant_id) a ON a.tenant_id = t.id
                LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.id
                LEFT JOIN subscription_plans sp ON sp.id = ts.plan_id
                WHERE t.id = :id
                LIMIT 1
            SQL,
            ['id' => $id],
        );

        if (!is_array($row)) {
            return $this->json(['error' => 'Tenant non trovato.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => (string) $row['id'],
            'business_name' => (string) $row['business_name'],
            'slug' => (string) $row['slug'],
            'timezone' => (string) $row['timezone'],
            'status' => (string) $row['status'],
            'primary_color' => $row['primary_color'] !== null ? (string) $row['primary_color'] : null,
            'secondary_color' => $row['secondary_color'] !== null ? (string) $row['secondary_color'] : null,
            'logo_url' => $row['logo_url'] !== null ? (string) $row['logo_url'] : null,
            'font_family' => $row['font_family'] !== null ? (string) $row['font_family'] : null,
            'settings' => $this->decodeJsonObject($row['settings'] ?? null),
            'created_at' => $this->toIsoString($row['created_at']),
            'updated_at' => $this->toIsoString($row['updated_at']),
            'services_count' => (int) $row['services_count'],
            'staff_count' => (int) $row['staff_count'],
            'locations_count' => (int) $row['locations_count'],
            'clients_count' => (int) $row['clients_count'],
            'appointments_count' => (int) $row['appointments_count'],
            'subscription' => [
                'plan_id' => $row['plan_id'] !== null ? (string) $row['plan_id'] : null,
                'status' => $row['subscription_status'] !== null ? (string) $row['subscription_status'] : null,
                'current_period_start' => $row['current_period_start'] !== null ? $this->toIsoString($row['current_period_start']) : null,
                'current_period_end' => $row['current_period_end'] !== null ? $this->toIsoString($row['current_period_end']) : null,
                'plan_name' => $row['plan_name'] !== null ? (string) $row['plan_name'] : null,
                'price_monthly' => $row['price_monthly'] !== null ? (float) $row['price_monthly'] : null,
            ],
        ]);
    }

    #[Route('/tenants/{id}', methods: ['PATCH'])]
    public function updateTenant(string $id, Request $request): JsonResponse
    {
        $this->requireSuperadminUser();
        $payload = $request->toArray();

        $updates = ['updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM)];
        foreach (['business_name', 'slug', 'timezone', 'status', 'primary_color', 'secondary_color', 'logo_url', 'font_family'] as $field) {
            if (array_key_exists($field, $payload)) {
                $updates[$field] = $payload[$field];
            }
        }
        if (array_key_exists('settings', $payload)) {
            $updates['settings'] = json_encode(
                is_array($payload['settings']) ? $payload['settings'] : [],
                \JSON_THROW_ON_ERROR,
            );
        }

        $this->connection->update('tenants', $updates, ['id' => $id]);

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{id}', methods: ['DELETE'])]
    public function deleteTenant(string $id): JsonResponse
    {
        $this->requireSuperadminUser();
        $this->connection->delete('tenants', ['id' => $id]);

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{id}/soft-delete', methods: ['POST'])]
    public function softDeleteTenant(string $id): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $this->connection->update('tenants', ['status' => 'suspended'], ['id' => $id]);
        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'tenant.suspended',
            'tenant',
            $id,
            $id,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{id}/export', methods: ['GET'])]
    public function exportTenant(string $id): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();

        $payload = [
            'exported_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'tenant' => $this->connection->fetchAssociative('SELECT * FROM tenants WHERE id = :id', ['id' => $id]) ?: null,
            'services' => $this->connection->fetchAllAssociative('SELECT * FROM services WHERE tenant_id = :id', ['id' => $id]),
            'staff' => $this->connection->fetchAllAssociative('SELECT * FROM staff_members WHERE tenant_id = :id', ['id' => $id]),
            'locations' => $this->connection->fetchAllAssociative('SELECT * FROM locations WHERE tenant_id = :id', ['id' => $id]),
            'working_hours' => $this->connection->fetchAllAssociative('SELECT * FROM working_hours WHERE tenant_id = :id', ['id' => $id]),
            'clients' => $this->connection->fetchAllAssociative('SELECT * FROM clients WHERE tenant_id = :id', ['id' => $id]),
            'appointments' => $this->connection->fetchAllAssociative('SELECT * FROM appointments WHERE tenant_id = :id', ['id' => $id]),
            'subscriptions' => $this->connection->fetchAllAssociative('SELECT * FROM tenant_subscriptions WHERE tenant_id = :id', ['id' => $id]),
        ];

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'tenant.exported',
            'tenant',
            $id,
            $id,
        );

        return $this->json($payload);
    }

    #[Route('/tenants/{id}/subscription', methods: ['PUT'])]
    public function updateTenantSubscription(string $id, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();

        $planId = $this->normalizeUuidString($payload['plan_id'] ?? null);
        $status = (string) ($payload['status'] ?? 'active');
        $startsAt = isset($payload['starts_at']) && is_string($payload['starts_at']) && trim($payload['starts_at']) !== ''
            ? (new \DateTimeImmutable($payload['starts_at']))->format(\DateTimeInterface::ATOM)
            : (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
        $endsAt = isset($payload['ends_at']) && is_string($payload['ends_at']) && trim($payload['ends_at']) !== ''
            ? (new \DateTimeImmutable($payload['ends_at']))->format(\DateTimeInterface::ATOM)
            : null;

        $existingId = $this->connection->fetchOne(
            'SELECT id FROM tenant_subscriptions WHERE tenant_id = :tenant_id LIMIT 1',
            ['tenant_id' => $id],
        );

        if ($existingId) {
            $this->connection->update('tenant_subscriptions', [
                'plan_id' => $planId,
                'status' => $status,
                'current_period_start' => $startsAt,
                'current_period_end' => $endsAt,
                'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ], ['id' => $existingId]);
        } else {
            $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
            $this->connection->insert('tenant_subscriptions', [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $id,
                'plan_id' => $planId,
                'status' => $status,
                'current_period_start' => $startsAt,
                'current_period_end' => $endsAt,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            'tenant.subscription_updated',
            'tenant',
            $id,
            $id,
            ['plan_id' => $planId],
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{id}/owner', methods: ['GET'])]
    public function tenantOwnerInfo(string $id): JsonResponse
    {
        $this->requireSuperadminUser();

        $row = $this->connection->fetchAssociative(
            <<<'SQL'
                SELECT p.id AS profile_id, p.full_name, COALESCE(p.email, u.email) AS email, p.avatar_url
                FROM staff_members sm
                INNER JOIN profiles p ON p.id = sm.profile_id
                INNER JOIN users u ON u.id = p.id
                WHERE sm.tenant_id = :tenant_id
                  AND sm.role = 'owner'
                  AND sm.is_active = TRUE
                ORDER BY sm.created_at ASC
                LIMIT 1
            SQL,
            ['tenant_id' => $id],
        );

        if (!is_array($row)) {
            return $this->json(null);
        }

        return $this->json([
            'profileId' => (string) $row['profile_id'],
            'fullName' => $row['full_name'] !== null ? (string) $row['full_name'] : null,
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'avatarUrl' => $row['avatar_url'] !== null ? (string) $row['avatar_url'] : null,
        ]);
    }

    #[Route('/tenants/{id}/owner/self', methods: ['POST'])]
    public function assignTenantOwnerToCurrentSuperadmin(string $id): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $profileId = $currentUser->getId()->toRfc4122();

        $activeCount = $this->connection->fetchOne(
            <<<'SQL'
                SELECT COUNT(*)
                FROM staff_members
                WHERE tenant_id = :tenant_id
                  AND is_active = TRUE
            SQL,
            ['tenant_id' => $id],
        );

        if ((int) $activeCount > 0) {
            return $this->json(
                ['error' => 'Il tenant ha già almeno uno staff member attivo.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $existingMembershipId = $this->connection->fetchOne(
            'SELECT id FROM staff_members WHERE tenant_id = :tenant_id AND profile_id = :profile_id LIMIT 1',
            ['tenant_id' => $id, 'profile_id' => $profileId],
        );

        if ($existingMembershipId) {
            $this->connection->update('staff_members', [
                'role' => 'owner',
                'is_active' => true,
                'deleted_at' => null,
                'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ], ['id' => $existingMembershipId]);
        } else {
            $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
            $this->connection->insert('staff_members', [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $id,
                'profile_id' => $profileId,
                'role' => 'owner',
                'is_active' => true,
                'notification_preferences' => json_encode([], \JSON_THROW_ON_ERROR),
                'created_at' => $now,
                'updated_at' => $now,
                'show_on_website' => false,
            ]);
        }

        $this->adminAuditLogger->log(
            $profileId,
            'tenant.owner_self_assigned',
            'tenant',
            $id,
            $id,
        );

        return $this->json(['success' => true]);
    }

    #[Route('/tenants/{id}/owner/by-email', methods: ['POST'])]
    public function assignTenantOwnerByEmail(string $id, Request $request): JsonResponse
    {
        $currentUser = $this->requireSuperadminUser();
        $payload = $request->toArray();
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Email mancante.'], Response::HTTP_BAD_REQUEST);
        }

        $profileId = $this->connection->fetchOne(
            <<<'SQL'
                SELECT p.id
                FROM profiles p
                INNER JOIN users u ON u.id = p.id
                WHERE COALESCE(p.email, u.email) = :email
                LIMIT 1
            SQL,
            ['email' => $email],
        );

        if (!$profileId) {
            return $this->json(
                ['error' => 'Utente non trovato. Invitalo prima nella sezione Utenti.'],
                Response::HTTP_NOT_FOUND,
            );
        }

        $currentOwners = $this->connection->fetchAllAssociative(
            <<<'SQL'
                SELECT id, profile_id
                FROM staff_members
                WHERE tenant_id = :tenant_id
                  AND role = 'owner'
                  AND is_active = TRUE
            SQL,
            ['tenant_id' => $id],
        );

        $isChange = false;
        foreach ($currentOwners as $ownerRow) {
            if ((string) $ownerRow['profile_id'] === (string) $profileId) {
                continue;
            }

            $isChange = true;
            $this->connection->update('staff_members', [
                'role' => 'manager',
                'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ], ['id' => (string) $ownerRow['id']]);
        }

        $existingMembershipId = $this->connection->fetchOne(
            'SELECT id FROM staff_members WHERE tenant_id = :tenant_id AND profile_id = :profile_id LIMIT 1',
            ['tenant_id' => $id, 'profile_id' => (string) $profileId],
        );

        if ($existingMembershipId) {
            $this->connection->update('staff_members', [
                'role' => 'owner',
                'is_active' => true,
                'deleted_at' => null,
                'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ], ['id' => $existingMembershipId]);
        } else {
            $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
            $this->connection->insert('staff_members', [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $id,
                'profile_id' => (string) $profileId,
                'role' => 'owner',
                'is_active' => true,
                'notification_preferences' => json_encode([], \JSON_THROW_ON_ERROR),
                'created_at' => $now,
                'updated_at' => $now,
                'show_on_website' => false,
            ]);
        }

        $this->adminAuditLogger->log(
            $currentUser->getId()->toRfc4122(),
            $isChange ? 'tenant.owner_changed' : 'tenant.owner_assigned_by_email',
            'tenant',
            $id,
            $id,
            ['email' => $email],
        );

        return $this->json(['success' => true]);
    }

    private function requireSuperadminUser(): User
    {
        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($this->getUser());
    }

    private function loadUserById(string $id): ?User
    {
        $user = $this->em->find(User::class, $id);

        return $user instanceof User ? $user : null;
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

    private function normalizeMembershipRole(string $role): string
    {
        return match (mb_strtolower(trim($role))) {
            'owner' => 'owner',
            'admin', 'manager' => 'manager',
            'receptionist' => 'receptionist',
            default => 'staff',
        };
    }
}
