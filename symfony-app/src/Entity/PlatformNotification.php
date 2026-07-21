<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PlatformNotificationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: PlatformNotificationRepository::class)]
#[ORM\Table(name: 'platform_notifications')]
#[ORM\Index(name: 'idx_platform_notifications_created', columns: ['created_at'])]
#[ORM\Index(name: 'idx_platform_notifications_unread', columns: ['is_read', 'created_at'])]
class PlatformNotification
{
    public const TYPE_TENANT_CREATED = 'tenant_created';
    public const TYPE_TENANT_SUSPENDED = 'tenant_suspended';
    public const TYPE_TENANT_REACTIVATED = 'tenant_reactivated';
    public const TYPE_USER_REGISTERED_STAFF = 'user_registered_staff';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'text')]
    private string $type;

    #[ORM\Column(type: 'text')]
    private string $title;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $body = null;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Tenant $tenant = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'related_profile_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $relatedProfile = null;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $meta = [];

    #[ORM\Column(name: 'is_read', type: 'boolean', options: ['default' => false])]
    private bool $isRead = false;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }
    public function getBody(): ?string { return $this->body; }
    public function setBody(?string $body): static { $this->body = $body; return $this; }
    public function getTenant(): ?Tenant { return $this->tenant; }
    public function setTenant(?Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getRelatedProfile(): ?Profile { return $this->relatedProfile; }
    public function setRelatedProfile(?Profile $relatedProfile): static { $this->relatedProfile = $relatedProfile; return $this; }
    public function getMeta(): array { return $this->meta; }
    public function setMeta(array $meta): static { $this->meta = $meta; return $this; }
    public function isRead(): bool { return $this->isRead; }
    public function setIsRead(bool $isRead): static { $this->isRead = $isRead; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
