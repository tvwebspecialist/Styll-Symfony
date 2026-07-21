<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\WebsitePhotoRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/website-photos',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new Get(
            uriTemplate: '/public/tenants/{slug}/website-photos/{id}',
            uriVariables: [
                'slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug']),
                'id' => new Link(fromClass: WebsitePhoto::class),
            ],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
    normalizationContext: ['groups' => ['media:read']],
)]
#[ORM\Entity(repositoryClass: WebsitePhotoRepository::class)]
#[ORM\Table(name: 'website_photos')]
#[ORM\Index(name: 'idx_website_photos_tenant_sort', columns: ['tenant_id', 'sort_order'])]
class WebsitePhoto
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['media:read', 'public:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'text')]
    #[Groups(['media:read', 'public:read'])]
    private string $url;

    #[ORM\Column(name: 'sort_order', type: 'integer', nullable: true)]
    #[Groups(['media:read', 'public:read'])]
    private ?int $sortOrder = null;

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
    public function getUrl(): string { return $this->url; }
    public function setUrl(string $url): static { $this->url = $url; return $this; }
    public function getSortOrder(): ?int { return $this->sortOrder; }
    public function setSortOrder(?int $sortOrder): static { $this->sortOrder = $sortOrder; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
