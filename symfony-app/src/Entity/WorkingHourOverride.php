<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\WorkingHourOverrideRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/** AREA 4 — Exception override for a specific date (holidays, special hours, closures). */
#[ORM\Entity(repositoryClass: WorkingHourOverrideRepository::class)]
#[ORM\Table(name: 'working_hour_overrides')]
class WorkingHourOverride
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private StaffMember $staff;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $date;

    #[ORM\Column(name: 'is_closed', type: 'boolean')]
    private bool $isClosed = false;

    #[ORM\Column(name: 'start_time', type: 'time_immutable', nullable: true)]
    private ?\DateTimeImmutable $startTime = null;

    #[ORM\Column(name: 'end_time', type: 'time_immutable', nullable: true)]
    private ?\DateTimeImmutable $endTime = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getStaff(): StaffMember { return $this->staff; }
    public function setStaff(StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getDate(): \DateTimeImmutable { return $this->date; }
    public function setDate(\DateTimeImmutable $date): static { $this->date = $date; return $this; }
    public function isClosed(): bool { return $this->isClosed; }
    public function setIsClosed(bool $v): static { $this->isClosed = $v; return $this; }
    public function getStartTime(): ?\DateTimeImmutable { return $this->startTime; }
    public function setStartTime(?\DateTimeImmutable $t): static { $this->startTime = $t; return $this; }
    public function getEndTime(): ?\DateTimeImmutable { return $this->endTime; }
    public function setEndTime(?\DateTimeImmutable $t): static { $this->endTime = $t; return $this; }
    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $r): static { $this->reason = $r; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
