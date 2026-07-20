<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\WorkingHourRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/** AREA 4 — Recurring weekly schedule entry for a staff member. */
#[ORM\Entity(repositoryClass: WorkingHourRepository::class)]
#[ORM\Table(name: 'working_hours')]
class WorkingHour
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

    #[ORM\ManyToOne(targetEntity: Location::class)]
    #[ORM\JoinColumn(name: 'location_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Location $location = null;

    #[ORM\Column(name: 'day_of_week', type: 'integer')]
    private int $dayOfWeek;

    #[ORM\Column(name: 'start_time', type: 'time_immutable')]
    private \DateTimeImmutable $startTime;

    #[ORM\Column(name: 'end_time', type: 'time_immutable')]
    private \DateTimeImmutable $endTime;

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
    public function getLocation(): ?Location { return $this->location; }
    public function setLocation(?Location $location): static { $this->location = $location; return $this; }
    public function getDayOfWeek(): int { return $this->dayOfWeek; }
    public function setDayOfWeek(int $dow): static { $this->dayOfWeek = $dow; return $this; }
    public function getStartTime(): \DateTimeImmutable { return $this->startTime; }
    public function setStartTime(\DateTimeImmutable $t): static { $this->startTime = $t; return $this; }
    public function getEndTime(): \DateTimeImmutable { return $this->endTime; }
    public function setEndTime(\DateTimeImmutable $t): static { $this->endTime = $t; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
