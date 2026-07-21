<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\ServiceCategoryRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/service-categories',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new Get(
            uriTemplate: '/public/tenants/{slug}/service-categories/{id}',
            uriVariables: [
                'slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug']),
                'id' => new Link(fromClass: ServiceCategory::class),
            ],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
)]
#[ORM\Entity(repositoryClass: ServiceCategoryRepository::class)]
#[ORM\Table(name: 'service_categories')]
#[ORM\UniqueConstraint(name: 'uniq_service_category_tenant_name', columns: ['tenant_id', 'name'])]
class ServiceCategory
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['public:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['public:read'])]
    private string $name;

    #[ORM\Column(name: 'display_order', type: 'integer')]
    #[Groups(['public:read'])]
    private int $displayOrder = 0;

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
    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $displayOrder): static { $this->displayOrder = $displayOrder; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
