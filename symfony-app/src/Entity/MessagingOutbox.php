<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\MessagingOutboxRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: MessagingOutboxRepository::class)]
#[ORM\Table(name: 'messaging_outbox')]
#[ORM\UniqueConstraint(name: 'messaging_outbox_idempotency_key_key', columns: ['idempotency_key'])]
#[ORM\Index(name: 'idx_messaging_outbox_pending_scheduled', columns: ['scheduled_for'])]
class MessagingOutbox
{
    public const CHANNEL_SMS = 'sms';
    public const CHANNEL_WHATSAPP = 'whatsapp';
    public const CHANNEL_EMAIL = 'email';
    public const CHANNEL_PUSH = 'push';

    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Client $client = null;

    #[ORM\ManyToOne(targetEntity: Appointment::class)]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Appointment $appointment = null;

    #[ORM\ManyToOne(targetEntity: MessageTemplate::class)]
    #[ORM\JoinColumn(name: 'template_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?MessageTemplate $template = null;

    #[ORM\Column(type: 'string', length: 20)]
    private string $channel;

    #[ORM\Column(name: 'scheduled_for', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $scheduledFor;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $payload = [];

    #[ORM\Column(type: 'string', length: 20, options: ['default' => self::STATUS_PENDING])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $attempts = 0;

    #[ORM\Column(name: 'last_attempt_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastAttemptAt = null;

    #[ORM\Column(name: 'last_error', type: 'text', nullable: true)]
    private ?string $lastError = null;

    #[ORM\ManyToOne(targetEntity: MessageLog::class)]
    #[ORM\JoinColumn(name: 'messages_log_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?MessageLog $messageLog = null;

    #[ORM\Column(name: 'idempotency_key', type: 'string', length: 255)]
    private string $idempotencyKey;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->scheduledFor = $this->createdAt;
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): static { $this->client = $client; return $this; }
    public function getAppointment(): ?Appointment { return $this->appointment; }
    public function setAppointment(?Appointment $appointment): static { $this->appointment = $appointment; return $this; }
    public function getTemplate(): ?MessageTemplate { return $this->template; }
    public function setTemplate(?MessageTemplate $template): static { $this->template = $template; return $this; }
    public function getChannel(): string { return $this->channel; }
    public function setChannel(string $channel): static { $this->channel = $channel; return $this; }
    public function getScheduledFor(): \DateTimeImmutable { return $this->scheduledFor; }
    public function setScheduledFor(\DateTimeImmutable $scheduledFor): static { $this->scheduledFor = $scheduledFor; return $this; }
    public function getPayload(): array { return $this->payload; }
    public function setPayload(array $payload): static { $this->payload = $payload; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getAttempts(): int { return $this->attempts; }
    public function setAttempts(int $attempts): static { $this->attempts = $attempts; return $this; }
    public function getLastAttemptAt(): ?\DateTimeImmutable { return $this->lastAttemptAt; }
    public function setLastAttemptAt(?\DateTimeImmutable $lastAttemptAt): static { $this->lastAttemptAt = $lastAttemptAt; return $this; }
    public function getLastError(): ?string { return $this->lastError; }
    public function setLastError(?string $lastError): static { $this->lastError = $lastError; return $this; }
    public function getMessageLog(): ?MessageLog { return $this->messageLog; }
    public function setMessageLog(?MessageLog $messageLog): static { $this->messageLog = $messageLog; return $this; }
    public function getIdempotencyKey(): string { return $this->idempotencyKey; }
    public function setIdempotencyKey(string $idempotencyKey): static { $this->idempotencyKey = $idempotencyKey; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
