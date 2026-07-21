<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\PromotionProductRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/promotion-products',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new Get(
            uriTemplate: '/public/tenants/{slug}/promotion-products/{id}',
            uriVariables: [
                'slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug']),
                'id' => new Link(fromClass: PromotionProduct::class),
            ],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
    normalizationContext: ['groups' => ['promotion_item:read']],
)]
#[ORM\Entity(repositoryClass: PromotionProductRepository::class)]
#[ORM\Table(name: 'promotion_products')]
#[ORM\Index(name: 'promotion_products_promotion_id_idx', columns: ['promotion_id'])]
#[ORM\Index(name: 'promotion_products_product_id_idx', columns: ['product_id'])]
#[ORM\Index(name: 'promotion_products_tenant_id_idx', columns: ['tenant_id'])]
class PromotionProduct
{
    public const DISCOUNT_PERCENT = 'percent';
    public const DISCOUNT_FIXED = 'fixed';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['promotion_item:read', 'public:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Promotion::class)]
    #[ORM\JoinColumn(name: 'promotion_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    #[Groups(['promotion_item:read', 'public:read'])]
    private Promotion $promotion;

    #[ORM\ManyToOne(targetEntity: Product::class)]
    #[ORM\JoinColumn(name: 'product_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    #[Groups(['public:read'])]
    private Product $product;

    #[ORM\Column(name: 'discount_type', type: 'string', length: 30)]
    #[Groups(['promotion_item:read', 'public:read'])]
    private string $discountType;

    #[ORM\Column(name: 'discount_value', type: 'decimal', precision: 10, scale: 2)]
    #[Groups(['promotion_item:read', 'public:read'])]
    private string $discountValue;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getPromotion(): Promotion { return $this->promotion; }
    public function setPromotion(Promotion $promotion): static { $this->promotion = $promotion; return $this; }
    public function getProduct(): Product { return $this->product; }
    public function setProduct(Product $product): static { $this->product = $product; return $this; }
    public function getDiscountType(): string { return $this->discountType; }
    public function setDiscountType(string $discountType): static { $this->discountType = $discountType; return $this; }
    public function getDiscountValue(): string { return $this->discountValue; }
    public function setDiscountValue(string $discountValue): static { $this->discountValue = $discountValue; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
