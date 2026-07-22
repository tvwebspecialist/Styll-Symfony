<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\TenantActivityLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Doctrine\Persistence\ManagerRegistry;

final class TenantActivityLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TenantActivityLog::class);
    }

    public function findLatestLastLoginForTenant(string $tenantId): ?string
    {
        $value = $this->getEntityManager()->getConnection()->fetchOne(
            <<<'SQL'
                SELECT last_login_at
                FROM tenant_activity_log
                WHERE tenant_id = :tenant_id
                ORDER BY recorded_at DESC, created_at DESC
                LIMIT 1
            SQL,
            ['tenant_id' => $tenantId],
        );

        return $this->normalizeTimestamp($value);
    }

    /**
     * @param list<string> $tenantIds
     *
     * @return array<string, string|null>
     */
    public function findLatestLastLoginByTenantIds(array $tenantIds): array
    {
        if ($tenantIds === []) {
            return [];
        }

        $rows = $this->getEntityManager()->getConnection()->fetchAllAssociative(
            <<<'SQL'
                SELECT DISTINCT ON (tenant_id) tenant_id, last_login_at
                FROM tenant_activity_log
                WHERE tenant_id IN (:tenant_ids)
                ORDER BY tenant_id, recorded_at DESC, created_at DESC
            SQL,
            ['tenant_ids' => $tenantIds],
            ['tenant_ids' => ArrayParameterType::STRING],
        );

        $result = [];
        foreach ($rows as $row) {
            $result[(string) $row['tenant_id']] = $this->normalizeTimestamp($row['last_login_at'] ?? null);
        }

        return $result;
    }

    private function normalizeTimestamp(mixed $value): ?string
    {
        if ($value === false || $value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        return (new \DateTimeImmutable((string) $value))->format(\DateTimeInterface::ATOM);
    }
}
