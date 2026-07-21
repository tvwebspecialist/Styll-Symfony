<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\MessageLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['message_log:read']],
)]
#[ORM\Entity(repositoryClass: MessageLogRepository::class)]
#[ORM\Table(name: 'messages_log')]
#[ORM\Index(name: 'idx_messages_log_client_sent', columns: ['tenant_id', 'client_id', 'sent_at'])]
#[ORM\Index(name: 'idx_messages_log_billing', columns: ['tenant_id', 'sent_at', 'cost_cents'])]
class MessageLog
{
    public const CHANNEL_SMS = 'sms';
    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';
    public const CHANNEL_PUSH = 'push';

    public const STATUS_QUEUED = 'queued';
    public const STATUS_SENT = 'sent';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED = 'failed';
    public const STATUS_BOUNCED = 'bounced';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['message_log:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Client $client = null;

    #[ORM\ManyToOne(targetEntity: MessageTemplate::class)]
    #[ORM\JoinColumn(name: 'template_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?MessageTemplate $template = null;

    #[ORM\Column(type: 'string', length: 20)]
    #[Groups(['message_log:read'])]
    private string $channel;

    #[ORM\Column(type: 'string', length: 60)]
    #[Groups(['message_log:read'])]
    private string $type;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Groups(['message_log:read'])]
    private ?string $recipient = null;

    #[ORM\Column(name: 'body_sent', type: 'text', nullable: true)]
    private ?string $bodySent = null;

    #[ORM\Column(type: 'string', length: 20)]
    #[Groups(['message_log:read'])]
    private string $status;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 4, nullable: true)]
    private ?string $cost = null;

    #[ORM\Column(name: 'cost_cents', type: 'bigint', options: ['default' => 0])]
    #[Groups(['message_log:read'])]
    private string $costCents = '0';

    #[ORM\Column(name: 'external_id', type: 'string', length: 255, nullable: true)]
    private ?string $externalId = null;

    #[ORM\Column(name: 'sent_at', type: 'datetimetz_immutable', nullable: true)]
    #[Groups(['message_log:read'])]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['message_log:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): static { $this->client = $client; return $this; }
    public function getTemplate(): ?MessageTemplate { return $this->template; }
    public function setTemplate(?MessageTemplate $template): static { $this->template = $template; return $this; }
    public function getChannel(): string { return $this->channel; }
    public function setChannel(string $channel): static { $this->channel = $channel; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getRecipient(): ?string { return $this->recipient; }
    public function setRecipient(?string $recipient): static { $this->recipient = $recipient; return $this; }
    public function getBodySent(): ?string { return $this->bodySent; }
    public function setBodySent(?string $bodySent): static { $this->bodySent = $bodySent; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getCost(): ?string { return $this->cost; }
    public function setCost(?string $cost): static { $this->cost = $cost; return $this; }
    public function getCostCents(): string { return $this->costCents; }
    public function setCostCents(string $costCents): static { $this->costCents = $costCents; return $this; }
    public function getExternalId(): ?string { return $this->externalId; }
    public function setExternalId(?string $externalId): static { $this->externalId = $externalId; return $this; }
    public function getSentAt(): ?\DateTimeImmutable { return $this->sentAt; }
    public function setSentAt(?\DateTimeImmutable $sentAt): static { $this->sentAt = $sentAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
