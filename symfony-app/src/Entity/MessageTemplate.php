<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\MessageTemplateRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['message_template:read']],
)]
#[ORM\Entity(repositoryClass: MessageTemplateRepository::class)]
#[ORM\Table(name: 'message_templates')]
#[ORM\Index(name: 'idx_message_templates_tenant_channel', columns: ['tenant_id', 'channel', 'is_active'])]
#[ORM\HasLifecycleCallbacks]
class MessageTemplate
{
    public const TYPE_REMINDER = 'reminder';
    public const TYPE_CONFIRMATION = 'confirmation';
    public const TYPE_WIN_BACK = 'win_back';
    public const TYPE_REVIEW_REQUEST = 'review_request';
    public const TYPE_LOYALTY_UPDATE = 'loyalty_update';
    public const TYPE_CUSTOM = 'custom';

    public const CHANNEL_SMS = 'sms';
    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';
    public const CHANNEL_PUSH = 'push';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['message_template:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['message_template:read'])]
    private string $name;

    #[ORM\Column(type: 'string', length: 40)]
    #[Groups(['message_template:read'])]
    private string $type;

    #[ORM\Column(type: 'string', length: 20)]
    #[Groups(['message_template:read'])]
    private string $channel;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Groups(['message_template:read'])]
    private ?string $subject = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['message_template:read'])]
    private string $body;

    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    #[Groups(['message_template:read'])]
    private bool $isActive = true;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['message_template:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getChannel(): string { return $this->channel; }
    public function setChannel(string $channel): static { $this->channel = $channel; return $this; }
    public function getSubject(): ?string { return $this->subject; }
    public function setSubject(?string $subject): static { $this->subject = $subject; return $this; }
    public function getBody(): string { return $this->body; }
    public function setBody(string $body): static { $this->body = $body; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
