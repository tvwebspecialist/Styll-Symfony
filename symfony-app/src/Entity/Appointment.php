<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Filter\AppointmentCalendarFilter;
use App\Repository\AppointmentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 4 — Calendar: Core appointment entity.
 * Exclusion constraint (no overlapping appointments per staff) is enforced at DB level.
 * Optimistic locking via `version` column prevents concurrent double-booking.
 */
#[ApiResource(
    operations: [
        new GetCollection(
            normalizationContext: ['groups' => ['appointment:read']],
            filters: [AppointmentCalendarFilter::class],
        ),
        new Get(
            normalizationContext: ['groups' => ['appointment:read']],
        ),
    ],
)]
#[ORM\Entity(repositoryClass: AppointmentRepository::class)]
#[ORM\Table(name: 'appointments')]
#[ORM\HasLifecycleCallbacks]
class Appointment
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_NO_SHOW   = 'no_show';

    public const SOURCE_PWA                   = 'pwa';
    public const SOURCE_DASHBOARD_OWNER       = 'dashboard_owner';
    public const SOURCE_DASHBOARD_MANAGER     = 'dashboard_manager';
    public const SOURCE_DASHBOARD_STAFF       = 'dashboard_staff';
    public const SOURCE_DASHBOARD_RECEPTIONIST = 'dashboard_receptionist';
    public const SOURCE_WALK_IN               = 'walk_in';
    public const SOURCE_PHONE                 = 'phone';
    public const SOURCE_WHATSAPP              = 'whatsapp';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['appointment:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false)]
    private Client $client;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: false)]
    private StaffMember $staff;

    #[ORM\ManyToOne(targetEntity: Location::class)]
    #[ORM\JoinColumn(name: 'location_id', referencedColumnName: 'id', nullable: false)]
    private Location $location;

    #[ORM\OneToMany(targetEntity: AppointmentService::class, mappedBy: 'appointment', fetch: 'EXTRA_LAZY')]
    private Collection $appointmentServices;

    #[ORM\Column(name: 'start_time', type: 'datetimetz_immutable')]
    #[Groups(['appointment:read'])]
    private \DateTimeImmutable $startTime;

    #[ORM\Column(name: 'end_time', type: 'datetimetz_immutable')]
    #[Groups(['appointment:read'])]
    private \DateTimeImmutable $endTime;

    #[ORM\Column(type: 'string', length: 20)]
    #[Groups(['appointment:read'])]
    private string $status = self::STATUS_CONFIRMED;

    #[ORM\Column(name: 'booking_source', type: 'string', length: 30)]
    #[Groups(['appointment:read'])]
    private string $bookingSource = self::SOURCE_PWA;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'booked_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $bookedBy = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $createdBy = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['appointment:read'])]
    private ?string $notes = null;

    #[ORM\Column(name: 'payment_status', type: 'string', length: 20)]
    private string $paymentStatus = 'unpaid';

    #[ORM\Column(name: 'booking_confirmation_token', type: 'string', length: 128, nullable: true, unique: true)]
    private ?string $bookingConfirmationToken = null;

    #[ORM\Version]
    #[ORM\Column(type: 'integer')]
    private int $version = 1;

    #[ORM\Column(name: 'deleted_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'deleted_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $deletedBy = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->appointmentServices = new ArrayCollection();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getStaff(): StaffMember { return $this->staff; }
    public function setStaff(StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getLocation(): Location { return $this->location; }
    public function setLocation(Location $location): static { $this->location = $location; return $this; }

    /** @return Collection<int, AppointmentService> */
    public function getAppointmentServices(): Collection { return $this->appointmentServices; }

    #[Groups(['appointment:read'])]
    public function getClientId(): string { return (string) $this->client->getId(); }

    #[Groups(['appointment:read'])]
    public function getClientFullName(): ?string { return $this->client->getFullName(); }

    #[Groups(['appointment:read'])]
    public function getStaffId(): string { return (string) $this->staff->getId(); }

    #[Groups(['appointment:read'])]
    public function getStaffFullName(): ?string { return $this->staff->getProfile()->getFullName(); }

    #[Groups(['appointment:read'])]
    public function getLocationId(): string { return (string) $this->location->getId(); }

    #[Groups(['appointment:read'])]
    public function getLocationName(): string { return $this->location->getName(); }

    #[Groups(['appointment:read'])]
    public function getServices(): array
    {
        return array_values(array_map(
            static fn (AppointmentService $as): array => [
                'id' => (string) $as->getService()->getId(),
                'name' => $as->getService()->getName(),
                'durationMinutes' => $as->getService()->getDurationMinutes(),
                'category' => $as->getService()->getCategory(),
                'priceAtBooking' => $as->getPriceAtBooking(),
            ],
            $this->appointmentServices->toArray(),
        ));
    }

    #[Groups(['appointment:read'])]
    public function getTotalPrice(): float
    {
        $total = 0.0;
        foreach ($this->appointmentServices as $as) {
            $total += (float) $as->getPriceAtBooking();
        }
        return $total;
    }
    public function getStartTime(): \DateTimeImmutable { return $this->startTime; }
    public function setStartTime(\DateTimeImmutable $t): static { $this->startTime = $t; return $this; }
    public function getEndTime(): \DateTimeImmutable { return $this->endTime; }
    public function setEndTime(\DateTimeImmutable $t): static { $this->endTime = $t; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getBookingSource(): string { return $this->bookingSource; }
    public function setBookingSource(string $source): static { $this->bookingSource = $source; return $this; }
    public function getBookedBy(): ?Profile { return $this->bookedBy; }
    public function setBookedBy(?Profile $p): static { $this->bookedBy = $p; return $this; }
    public function getCreatedBy(): ?Profile { return $this->createdBy; }
    public function setCreatedBy(?Profile $p): static { $this->createdBy = $p; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): static { $this->notes = $notes; return $this; }
    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $s): static { $this->paymentStatus = $s; return $this; }
    public function getBookingConfirmationToken(): ?string { return $this->bookingConfirmationToken; }
    public function setBookingConfirmationToken(?string $t): static { $this->bookingConfirmationToken = $t; return $this; }
    public function getVersion(): int { return $this->version; }
    public function getDeletedAt(): ?\DateTimeImmutable { return $this->deletedAt; }
    public function setDeletedAt(?\DateTimeImmutable $d): static { $this->deletedAt = $d; return $this; }
    public function isDeleted(): bool { return $this->deletedAt !== null; }
    public function getDeletedBy(): ?Profile { return $this->deletedBy; }
    public function setDeletedBy(?Profile $p): static { $this->deletedBy = $p; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
