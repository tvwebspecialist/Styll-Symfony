<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientProductWishlistRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ClientProductWishlistRepository::class)]
#[ORM\Table(name: 'client_product_wishlist')]
#[ORM\UniqueConstraint(name: 'uniq_client_product_wishlist', columns: ['client_id', 'product_id'])]
class ClientProductWishlist
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Client $client;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Product $product;

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
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): static { $this->product = $product; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
