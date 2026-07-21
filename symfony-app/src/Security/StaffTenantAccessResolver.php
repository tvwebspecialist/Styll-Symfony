<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Resolves authenticated staff memberships without relying on the tenant filter.
 *
 * Client input can suggest a tenant via slug, but the final tenant is always
 * derived server-side by intersecting that slug with the caller's active
 * staff_members rows.
 */
class StaffTenantAccessResolver
{
    private const TENANT_SLUG_HEADER = 'X-Tenant-Slug';

    public function __construct(
        private readonly Connection $connection,
        private readonly RequestStack $requestStack,
    ) {}

    public function resolveForUser(User $user): ResolvedStaffAccess
    {
        return $this->resolveForProfileId($user->getId()->toRfc4122());
    }

    public function resolveForProfileId(string $profileId): ResolvedStaffAccess
    {
        $memberships = $this->fetchActiveMemberships($profileId);
        $requestedTenantSlug = $this->resolveRequestedTenantSlug();

        return new ResolvedStaffAccess(
            memberships: $memberships,
            currentMembership: $this->selectCurrentMembership($memberships, $requestedTenantSlug),
            requestedTenantSlug: $requestedTenantSlug,
        );
    }

    /**
     * @return list<StaffTenantMembership>
     */
    private function fetchActiveMemberships(string $profileId): array
    {
        $rows = $this->connection->executeQuery(
            <<<'SQL'
                SELECT
                    sm.id AS staff_member_id,
                    sm.role AS role,
                    t.id AS tenant_id,
                    t.slug AS tenant_slug,
                    t.business_name AS business_name,
                    t.logo_url AS logo_url,
                    t.status AS status,
                    t.timezone AS timezone
                FROM staff_members sm
                INNER JOIN tenants t ON t.id = sm.tenant_id
                WHERE sm.profile_id = :profile_id
                  AND sm.is_active = TRUE
                  AND sm.deleted_at IS NULL
                ORDER BY sm.created_at ASC, sm.id ASC
            SQL,
            ['profile_id' => $profileId],
        )->fetchAllAssociative();

        return array_map(
            static fn (array $row): StaffTenantMembership => new StaffTenantMembership(
                staffMemberId: (string) $row['staff_member_id'],
                tenantId: (string) $row['tenant_id'],
                tenantSlug: (string) $row['tenant_slug'],
                businessName: (string) $row['business_name'],
                logoUrl: isset($row['logo_url']) ? (string) $row['logo_url'] : null,
                status: (string) $row['status'],
                timezone: (string) $row['timezone'],
                role: (string) $row['role'],
            ),
            $rows,
        );
    }

    /**
     * @param list<StaffTenantMembership> $memberships
     */
    private function selectCurrentMembership(array $memberships, ?string $requestedTenantSlug): ?StaffTenantMembership
    {
        if ($memberships === []) {
            return null;
        }

        if ($requestedTenantSlug === null) {
            return $memberships[0];
        }

        foreach ($memberships as $membership) {
            if ($membership->tenantSlug === $requestedTenantSlug) {
                return $membership;
            }
        }

        return null;
    }

    private function resolveRequestedTenantSlug(): ?string
    {
        $request = $this->requestStack->getCurrentRequest();
        if (!$request instanceof Request) {
            return null;
        }

        foreach ([
            $request->headers->get(self::TENANT_SLUG_HEADER),
            $request->query->get('tenantSlug'),
            $request->query->get('_tenant_slug'),
            $request->attributes->get('tenantSlug'),
        ] as $candidate) {
            if (!is_string($candidate)) {
                continue;
            }

            $normalized = trim($candidate);
            if ($normalized !== '') {
                return $normalized;
            }
        }

        return null;
    }
}
