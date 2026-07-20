<?php

declare(strict_types=1);

namespace App\Doctrine;

use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\Filter\SQLFilter;

/**
 * Doctrine SQL Filter — global multi-tenant isolation.
 *
 * Automatically appends `AND t.tenant_id = '<uuid>'` to every SELECT query
 * on entities that have a `tenant_id` column.
 *
 * This filter MUST be enabled on every request that has an authenticated tenant
 * context. It is registered globally and enabled via the TenantFilterSubscriber
 * event listener after the JWT is verified.
 *
 * Entities that legitimately have no tenant_id (users, profiles, subscription_plans,
 * tenants itself) are NOT filtered — the filter only applies when the column exists.
 *
 * Usage (in tests or controllers — normally automatic):
 *   $em->getFilters()->enable('tenant_filter')->setParameter('tenant_id', $uuid);
 *
 * Implements D6 from MIGRATION-LOG.md.
 */
class TenantFilter extends SQLFilter
{
    /**
     * Entities explicitly excluded from tenant filtering.
     * These are global/platform-level tables with no tenant_id column.
     */
    private const EXCLUDED_ENTITIES = [
        'App\Entity\User',
        'App\Entity\Profile',
        'App\Entity\Tenant',
        'App\Entity\SubscriptionPlan',
    ];

    public function addFilterConstraint(ClassMetadata $targetEntity, string $targetTableAlias): string
    {
        if (in_array($targetEntity->getName(), self::EXCLUDED_ENTITIES, true)) {
            return '';
        }

        // Check for 'tenant' ManyToOne join column named tenant_id
        $hasColumn = false;
        foreach ($targetEntity->getAssociationMappings() as $assocName => $assoc) {
            if ($assocName === 'tenant' && isset($assoc['joinColumns'])) {
                foreach ($assoc['joinColumns'] as $joinCol) {
                    if (($joinCol['name'] ?? '') === 'tenant_id') {
                        $hasColumn = true;
                        break 2;
                    }
                }
            }
        }

        // Fallback: direct tenant_id scalar column
        if (!$hasColumn) {
            $hasColumn = in_array('tenant_id', $targetEntity->getColumnNames(), true);
        }

        if (!$hasColumn) {
            return '';
        }

        try {
            $tenantId = $this->getParameter('tenant_id');
        } catch (\InvalidArgumentException) {
            // Filter enabled but tenant_id not set → fail-closed, block all rows
            return '1 = 0';
        }

        return sprintf('%s.tenant_id = %s', $targetTableAlias, $tenantId);
    }
}
