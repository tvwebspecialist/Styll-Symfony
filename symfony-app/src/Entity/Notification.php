<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\NotificationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['notification:read']],
)]
#[ORM\Entity(repositoryClass: NotificationRepository::class)]
#[ORM\Table(name: 'notifications')]
#[ORM\Index(name: 'idx_notifications_tenant_created', columns: ['tenant_id', 'created_at'])]
#[ORM\Index(name: 'idx_notifications_unread', columns: ['tenant_id', 'is_read', 'created_at'])]
class Notification
{
    public const TYPE_NEW_BOOKING = 'new_booking';
    public const TYPE_CANCELLATION = 'cancellation';
    public const TYPE_NEW_CLIENT = 'new_client';
    public const TYPE_CHURN_ALERT = 'churn_alert';
    public const TYPE_LOW_STOCK = 'low_stock';
    public const TYPE_LOYALTY_MILESTONE = 'loyalty_milestone';
    public const TYPE_RESCHEDULE = 'reschedule';
    public const TYPE_BOOKING_CONFIRMED = 'booking_confirmed';
    public const TYPE_REMINDER_3D = 'reminder_3d';
    public const TYPE_REMINDER_1D = 'reminder_1d';
    public const TYPE_REMINDER_DAY = 'reminder_day';
    public const TYPE_PROMOTION_PUBLISHED = 'promotion_published';
    public const TYPE_CAMPAIGN = 'campaign';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['notification:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $profile = null;

    #[ORM\Column(type: 'string', length: 40)]
    #[Groups(['notification:read'])]
    private string $type;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['notification:read'])]
    private string $title;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['notification:read'])]
    private ?string $body = null;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    #[Groups(['notification:read'])]
    private array $meta = [];

    #[ORM\Column(name: 'is_read', type: 'boolean', options: ['default' => false])]
    #[Groups(['notification:read'])]
    private bool $isRead = false;

    #[ORM\Column(name: 'read_at', type: 'datetimetz_immutable', nullable: true)]
    #[Groups(['notification:read'])]
    private ?\DateTimeImmutable $readAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['notification:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getProfile(): ?Profile { return $this->profile; }
    public function setProfile(?Profile $profile): static { $this->profile = $profile; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }
    public function getBody(): ?string { return $this->body; }
    public function setBody(?string $body): static { $this->body = $body; return $this; }
    public function getMeta(): array { return $this->meta; }
    public function setMeta(array $meta): static { $this->meta = $meta; return $this; }
    public function isRead(): bool { return $this->isRead; }
    public function setIsRead(bool $isRead): static { $this->isRead = $isRead; return $this; }
    public function getReadAt(): ?\DateTimeImmutable { return $this->readAt; }
    public function setReadAt(?\DateTimeImmutable $readAt): static { $this->readAt = $readAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
