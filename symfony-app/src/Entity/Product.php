<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ProductRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ProductRepository::class)]
#[ORM\Table(name: 'products')]
#[ORM\HasLifecycleCallbacks]
class Product
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $brand = null;

    #[ORM\Column(name: 'price_sell', type: 'decimal', precision: 10, scale: 2)]
    private string $priceSell;

    #[ORM\Column(name: 'price_cost', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $priceCost = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $sku = null;

    #[ORM\Column(name: 'photo_url', type: 'string', length: 500, nullable: true)]
    private ?string $photoUrl = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    private ?string $category = null;

    #[ORM\Column(name: 'is_active', type: 'boolean')]
    private bool $isActive = true;

    #[ORM\Column(name: 'is_new', type: 'boolean')]
    private bool $isNew = false;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
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
    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getBrand(): ?string { return $this->brand; }
    public function setBrand(?string $b): static { $this->brand = $b; return $this; }
    public function getPriceSell(): string { return $this->priceSell; }
    public function setPriceSell(string $price): static { $this->priceSell = $price; return $this; }
    public function getPriceCost(): ?string { return $this->priceCost; }
    public function setPriceCost(?string $price): static { $this->priceCost = $price; return $this; }
    public function getSku(): ?string { return $this->sku; }
    public function setSku(?string $sku): static { $this->sku = $sku; return $this; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $url): static { $this->photoUrl = $url; return $this; }
    public function getCategory(): ?string { return $this->category; }
    public function setCategory(?string $c): static { $this->category = $c; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): static { $this->isActive = $v; return $this; }
    public function isNew(): bool { return $this->isNew; }
    public function setIsNew(bool $v): static { $this->isNew = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
