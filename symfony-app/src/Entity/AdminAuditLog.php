<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AdminAuditLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AdminAuditLogRepository::class)]
#[ORM\Table(name: 'admin_audit_log')]
#[ORM\Index(name: 'admin_audit_log_created_at_idx', columns: ['created_at'])]
#[ORM\Index(name: 'admin_audit_log_tenant_idx', columns: ['tenant_id'])]
#[ORM\Index(name: 'admin_audit_log_entity_idx', columns: ['entity_type', 'entity_id'])]
class AdminAuditLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'actor_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $actor = null;

    #[ORM\Column(type: 'text')]
    private string $action;

    #[ORM\Column(name: 'entity_type', type: 'text')]
    private string $entityType;

    #[ORM\Column(name: 'entity_id', type: 'text', nullable: true)]
    private ?string $entityId = null;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Tenant $tenant = null;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $details = [];

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getActor(): ?User { return $this->actor; }
    public function setActor(?User $actor): static { $this->actor = $actor; return $this; }
    public function getAction(): string { return $this->action; }
    public function setAction(string $action): static { $this->action = $action; return $this; }
    public function getEntityType(): string { return $this->entityType; }
    public function setEntityType(string $entityType): static { $this->entityType = $entityType; return $this; }
    public function getEntityId(): ?string { return $this->entityId; }
    public function setEntityId(?string $entityId): static { $this->entityId = $entityId; return $this; }
    public function getTenant(): ?Tenant { return $this->tenant; }
    public function setTenant(?Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getDetails(): array { return $this->details; }
    public function setDetails(array $details): static { $this->details = $details; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
