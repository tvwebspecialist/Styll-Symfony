<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PaymentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 4 — Actual payment record. Separate from appointment: an appointment can be
 * completed but not yet paid, and a payment can later be refunded.
 */
#[ORM\Entity(repositoryClass: PaymentRepository::class)]
#[ORM\Table(name: 'payments')]
class Payment
{
    public const METHOD_CASH          = 'cash';
    public const METHOD_CARD_TERMINAL = 'card_terminal';
    public const METHOD_STRIPE_ONLINE = 'stripe_online';
    public const METHOD_BANK_TRANSFER = 'bank_transfer';
    public const METHOD_OTHER         = 'other';

    public const STATUS_PENDING        = 'pending';
    public const STATUS_COMPLETED      = 'completed';
    public const STATUS_REFUNDED       = 'refunded';
    public const STATUS_PARTIAL_REFUND = 'partial_refund';
    public const STATUS_FAILED         = 'failed';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Appointment::class)]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: true)]
    private ?Appointment $appointment = null;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false)]
    private Client $client;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $amount;

    #[ORM\Column(name: 'tip_amount', type: 'decimal', precision: 10, scale: 2)]
    private string $tipAmount = '0.00';

    #[ORM\Column(name: 'payment_method', type: 'string', length: 30)]
    private string $paymentMethod;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = self::STATUS_COMPLETED;

    #[ORM\Column(name: 'stripe_payment_id', type: 'string', length: 255, nullable: true)]
    private ?string $stripePaymentId = null;

    #[ORM\Column(name: 'refunded_amount', type: 'decimal', precision: 10, scale: 2)]
    private string $refundedAmount = '0.00';

    #[ORM\Column(name: 'refunded_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $refundedAt = null;

    #[ORM\Column(name: 'refund_reason', type: 'text', nullable: true)]
    private ?string $refundReason = null;

    #[ORM\Column(name: 'stripe_refund_id', type: 'string', length: 255, nullable: true)]
    private ?string $stripeRefundId = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(name: 'paid_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $paidAt;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $createdBy = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->paidAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getAppointment(): ?Appointment { return $this->appointment; }
    public function setAppointment(?Appointment $appt): static { $this->appointment = $appt; return $this; }
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getAmount(): string { return $this->amount; }
    public function setAmount(string $amount): static { $this->amount = $amount; return $this; }
    public function getTipAmount(): string { return $this->tipAmount; }
    public function setTipAmount(string $tip): static { $this->tipAmount = $tip; return $this; }
    public function getPaymentMethod(): string { return $this->paymentMethod; }
    public function setPaymentMethod(string $method): static { $this->paymentMethod = $method; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getStripePaymentId(): ?string { return $this->stripePaymentId; }
    public function setStripePaymentId(?string $id): static { $this->stripePaymentId = $id; return $this; }
    public function getRefundedAmount(): string { return $this->refundedAmount; }
    public function setRefundedAmount(string $a): static { $this->refundedAmount = $a; return $this; }
    public function getRefundedAt(): ?\DateTimeImmutable { return $this->refundedAt; }
    public function setRefundedAt(?\DateTimeImmutable $d): static { $this->refundedAt = $d; return $this; }
    public function getRefundReason(): ?string { return $this->refundReason; }
    public function setRefundReason(?string $r): static { $this->refundReason = $r; return $this; }
    public function getStripeRefundId(): ?string { return $this->stripeRefundId; }
    public function setStripeRefundId(?string $id): static { $this->stripeRefundId = $id; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $n): static { $this->notes = $n; return $this; }
    public function getPaidAt(): \DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(\DateTimeImmutable $d): static { $this->paidAt = $d; return $this; }
    public function getCreatedBy(): ?Profile { return $this->createdBy; }
    public function setCreatedBy(?Profile $p): static { $this->createdBy = $p; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
