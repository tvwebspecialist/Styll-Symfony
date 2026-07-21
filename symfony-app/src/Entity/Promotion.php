<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\PromotionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['promotion:read']],
)]
#[ORM\Entity(repositoryClass: PromotionRepository::class)]
#[ORM\Table(name: 'promotions')]
#[ORM\Index(name: 'promotions_tenant_id_idx', columns: ['tenant_id'])]
#[ORM\Index(name: 'promotions_active_idx', columns: ['is_active', 'valid_until'])]
#[ORM\HasLifecycleCallbacks]
class Promotion
{
    public const DISCOUNT_PERCENT = 'percent';
    public const DISCOUNT_FIXED = 'fixed';
    public const DISCOUNT_FREE_SERVICE = 'free_service';
    public const DISCOUNT_NONE = 'none';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['promotion:read', 'promotion_item:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['promotion:read'])]
    private string $title;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['promotion:read'])]
    private ?string $description = null;

    #[ORM\Column(name: 'discount_type', type: 'string', length: 30, options: ['default' => self::DISCOUNT_NONE])]
    #[Groups(['promotion:read'])]
    private string $discountType = self::DISCOUNT_NONE;

    #[ORM\Column(name: 'discount_value', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    #[Groups(['promotion:read'])]
    private ?string $discountValue = null;

    #[ORM\ManyToOne(targetEntity: Service::class)]
    #[ORM\JoinColumn(name: 'service_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Service $service = null;

    #[ORM\Column(name: 'valid_from', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['promotion:read'])]
    private \DateTimeImmutable $validFrom;

    #[ORM\Column(name: 'valid_until', type: 'datetimetz_immutable', nullable: true)]
    #[Groups(['promotion:read'])]
    private ?\DateTimeImmutable $validUntil = null;

    #[ORM\Column(name: 'show_on_landing', type: 'boolean', options: ['default' => true])]
    #[Groups(['promotion:read'])]
    private bool $showOnLanding = true;

    #[ORM\Column(name: 'show_in_app', type: 'boolean', options: ['default' => true])]
    #[Groups(['promotion:read'])]
    private bool $showInApp = true;

    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    #[Groups(['promotion:read'])]
    private bool $isActive = true;

    #[ORM\Column(name: 'display_order', type: 'integer', options: ['default' => 0])]
    #[Groups(['promotion:read'])]
    private int $displayOrder = 0;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['promotion:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->validFrom = new \DateTimeImmutable();
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
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getDiscountType(): string { return $this->discountType; }
    public function setDiscountType(string $discountType): static { $this->discountType = $discountType; return $this; }
    public function getDiscountValue(): ?string { return $this->discountValue; }
    public function setDiscountValue(?string $discountValue): static { $this->discountValue = $discountValue; return $this; }
    public function getService(): ?Service { return $this->service; }
    public function setService(?Service $service): static { $this->service = $service; return $this; }
    public function getValidFrom(): \DateTimeImmutable { return $this->validFrom; }
    public function setValidFrom(\DateTimeImmutable $validFrom): static { $this->validFrom = $validFrom; return $this; }
    public function getValidUntil(): ?\DateTimeImmutable { return $this->validUntil; }
    public function setValidUntil(?\DateTimeImmutable $validUntil): static { $this->validUntil = $validUntil; return $this; }
    public function isShowOnLanding(): bool { return $this->showOnLanding; }
    public function setShowOnLanding(bool $showOnLanding): static { $this->showOnLanding = $showOnLanding; return $this; }
    public function isShowInApp(): bool { return $this->showInApp; }
    public function setShowInApp(bool $showInApp): static { $this->showInApp = $showInApp; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $displayOrder): static { $this->displayOrder = $displayOrder; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
