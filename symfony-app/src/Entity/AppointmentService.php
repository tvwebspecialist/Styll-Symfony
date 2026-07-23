<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AppointmentServiceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 4 — Services booked within an appointment.
 * price_at_booking is a snapshot: immutable once created.
 */
#[ORM\Entity(repositoryClass: AppointmentServiceRepository::class)]
#[ORM\Table(name: 'appointment_services')]
class AppointmentService
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Appointment::class, inversedBy: 'appointmentServices')]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Appointment $appointment;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_id', referencedColumnName: 'id', nullable: false)]
    private Service $service;

    #[ORM\Column(name: 'price_at_booking', type: 'decimal', precision: 10, scale: 2)]
    private string $priceAtBooking;

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
    public function getAppointment(): Appointment { return $this->appointment; }
    public function setAppointment(Appointment $appt): static { $this->appointment = $appt; return $this; }
    public function getService(): Service { return $this->service; }
    public function setService(Service $service): static { $this->service = $service; return $this; }
    public function getPriceAtBooking(): string { return $this->priceAtBooking; }
    public function setPriceAtBooking(string $price): static { $this->priceAtBooking = $price; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
