<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\GalleryPhotoRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/gallery-photos',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new Get(
            uriTemplate: '/public/tenants/{slug}/gallery-photos/{id}',
            uriVariables: [
                'slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug']),
                'id' => new Link(fromClass: GalleryPhoto::class),
            ],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
    normalizationContext: ['groups' => ['media:read']],
)]
#[ORM\Entity(repositoryClass: GalleryPhotoRepository::class)]
#[ORM\Table(name: 'gallery_photos')]
class GalleryPhoto
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['media:read', 'public:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(name: 'photo_url', type: 'text')]
    #[Groups(['media:read', 'public:read'])]
    private string $photoUrl;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['media:read', 'public:read'])]
    private ?string $caption = null;

    #[ORM\Column(name: 'display_order', type: 'integer', options: ['default' => 0])]
    #[Groups(['media:read', 'public:read'])]
    private int $displayOrder = 0;

    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    #[Groups(['media:read'])]
    private bool $isActive = true;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    #[Groups(['media:read'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getPhotoUrl(): string { return $this->photoUrl; }
    public function setPhotoUrl(string $photoUrl): static { $this->photoUrl = $photoUrl; return $this; }
    public function getCaption(): ?string { return $this->caption; }
    public function setCaption(?string $caption): static { $this->caption = $caption; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $displayOrder): static { $this->displayOrder = $displayOrder; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
