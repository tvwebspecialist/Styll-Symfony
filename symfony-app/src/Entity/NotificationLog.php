<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\NotificationLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: NotificationLogRepository::class)]
#[ORM\Table(name: 'notification_log')]
#[ORM\UniqueConstraint(name: 'notification_log_unique', columns: ['appointment_id', 'type'])]
#[ORM\Index(name: 'idx_notification_log_profile', columns: ['profile_id'])]
#[ORM\Index(name: 'idx_notification_log_tenant', columns: ['tenant_id'])]
#[ORM\Index(name: 'idx_notification_log_sent_at', columns: ['sent_at'])]
#[ORM\Index(name: 'idx_notification_log_promotion', columns: ['promotion_id'])]
class NotificationLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $profile = null;

    #[ORM\ManyToOne(targetEntity: Appointment::class)]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Appointment $appointment = null;

    #[ORM\ManyToOne(targetEntity: Promotion::class)]
    #[ORM\JoinColumn(name: 'promotion_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Promotion $promotion = null;

    #[ORM\Column(type: 'string', length: 60)]
    private string $type;

    #[ORM\Column(name: 'sent_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $sentAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->sentAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getProfile(): ?Profile { return $this->profile; }
    public function setProfile(?Profile $profile): static { $this->profile = $profile; return $this; }
    public function getAppointment(): ?Appointment { return $this->appointment; }
    public function setAppointment(?Appointment $appointment): static { $this->appointment = $appointment; return $this; }
    public function getPromotion(): ?Promotion { return $this->promotion; }
    public function setPromotion(?Promotion $promotion): static { $this->promotion = $promotion; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getSentAt(): \DateTimeImmutable { return $this->sentAt; }
    public function setSentAt(\DateTimeImmutable $sentAt): static { $this->sentAt = $sentAt; return $this; }
}
