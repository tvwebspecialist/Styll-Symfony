<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\PortfolioPhotoRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['media:read']],
)]
#[ORM\Entity(repositoryClass: PortfolioPhotoRepository::class)]
#[ORM\Table(name: 'portfolio_photos')]
#[ORM\Index(name: 'portfolio_photos_tenant_idx', columns: ['tenant_id', 'display_order'])]
#[ORM\Index(name: 'portfolio_photos_staff_idx', columns: ['staff_id'])]
class PortfolioPhoto
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['media:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?StaffMember $staff = null;

    #[ORM\Column(name: 'photo_url', type: 'text')]
    #[Groups(['media:read'])]
    private string $photoUrl;

    #[ORM\Column(name: 'service_tags', type: 'string', columnDefinition: "TEXT[] NOT NULL DEFAULT '{}'")]
    private string $serviceTags = '{}';

    #[ORM\Column(name: 'is_visible', type: 'boolean', options: ['default' => true])]
    #[Groups(['media:read'])]
    private bool $isVisible = true;

    #[ORM\Column(name: 'display_order', type: 'integer', options: ['default' => 0])]
    #[Groups(['media:read'])]
    private int $displayOrder = 0;

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
    public function getStaff(): ?StaffMember { return $this->staff; }
    public function setStaff(?StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getPhotoUrl(): string { return $this->photoUrl; }
    public function setPhotoUrl(string $photoUrl): static { $this->photoUrl = $photoUrl; return $this; }
    public function getServiceTags(): string { return $this->serviceTags; }
    public function setServiceTags(string $serviceTags): static { $this->serviceTags = $serviceTags; return $this; }
    public function isVisible(): bool { return $this->isVisible; }
    public function setIsVisible(bool $isVisible): static { $this->isVisible = $isVisible; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $displayOrder): static { $this->displayOrder = $displayOrder; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
