<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Symfony\Component\Uid\Uuid;

final class AdminAuditLogger
{
    public function __construct(
        private readonly Connection $connection,
    ) {}

    /**
     * @param array<string, mixed> $details
     */
    public function log(
        ?string $actorId,
        string $action,
        string $entityType,
        ?string $entityId = null,
        ?string $tenantId = null,
        array $details = [],
    ): void {
        $this->connection->insert('admin_audit_log', [
            'id' => Uuid::v4()->toRfc4122(),
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'tenant_id' => $tenantId,
            'details' => json_encode($details, \JSON_THROW_ON_ERROR),
            'created_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }
}
