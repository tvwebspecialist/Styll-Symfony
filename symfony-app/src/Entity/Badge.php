<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BadgeRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: BadgeRepository::class)]
#[ORM\Table(name: 'badges')]
class Badge
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'icon_url', type: 'string', length: 500, nullable: true)]
    private ?string $iconUrl = null;

    #[ORM\Column(name: 'condition_type', type: 'string', length: 100, nullable: true)]
    private ?string $conditionType = null;

    #[ORM\Column(name: 'condition_value', type: 'integer', nullable: true)]
    private ?int $conditionValue = null;

    #[ORM\Column(name: 'is_active', type: 'boolean')]
    private bool $isActive = true;

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
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getIconUrl(): ?string { return $this->iconUrl; }
    public function setIconUrl(?string $iconUrl): static { $this->iconUrl = $iconUrl; return $this; }
    public function getConditionType(): ?string { return $this->conditionType; }
    public function setConditionType(?string $conditionType): static { $this->conditionType = $conditionType; return $this; }
    public function getConditionValue(): ?int { return $this->conditionValue; }
    public function setConditionValue(?int $conditionValue): static { $this->conditionValue = $conditionValue; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
