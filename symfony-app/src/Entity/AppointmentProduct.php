<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AppointmentProductRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 4 — Products sold during an appointment (price + quantity snapshot).
 */
#[ORM\Entity(repositoryClass: AppointmentProductRepository::class)]
#[ORM\Table(name: 'appointment_products')]
class AppointmentProduct
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Appointment::class)]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Appointment $appointment;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: false)]
    private Product $product;

    #[ORM\Column(type: 'integer')]
    private int $quantity = 1;

    #[ORM\Column(name: 'price_at_sale', type: 'decimal', precision: 10, scale: 2)]
    private string $priceAtSale;

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
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): static { $this->product = $product; return $this; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $q): static { $this->quantity = $q; return $this; }
    public function getPriceAtSale(): string { return $this->priceAtSale; }
    public function setPriceAtSale(string $price): static { $this->priceAtSale = $price; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
