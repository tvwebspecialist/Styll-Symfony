<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ProductInventoryRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ProductInventoryRepository::class)]
#[ORM\Table(name: 'product_inventory')]
#[ORM\UniqueConstraint(name: 'uniq_product_inventory_location', columns: ['product_id', 'location_id'])]
#[ORM\HasLifecycleCallbacks]
class ProductInventory
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\ManyToOne(targetEntity: Location::class)]
    #[ORM\JoinColumn(name: 'location_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Location $location;

    #[ORM\Column(type: 'integer')]
    private int $quantity = 0;

    #[ORM\Column(name: 'low_stock_threshold', type: 'integer')]
    private int $lowStockThreshold = 3;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
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
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): static { $this->product = $product; return $this; }
    public function getLocation(): Location { return $this->location; }
    public function setLocation(Location $location): static { $this->location = $location; return $this; }
    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $quantity): static { $this->quantity = $quantity; return $this; }
    public function getLowStockThreshold(): int { return $this->lowStockThreshold; }
    public function setLowStockThreshold(int $lowStockThreshold): static { $this->lowStockThreshold = $lowStockThreshold; return $this; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
