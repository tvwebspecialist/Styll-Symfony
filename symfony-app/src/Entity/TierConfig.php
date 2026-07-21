<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TierConfigRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TierConfigRepository::class)]
#[ORM\Table(name: 'tier_configs')]
class TierConfig
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(name: 'tier_name', type: 'string', length: 255)]
    private string $tierName;

    #[ORM\Column(name: 'min_points', type: 'integer')]
    private int $minPoints = 0;

    #[ORM\Column(type: 'json')]
    private array $benefits = [];

    #[ORM\Column(name: 'visual_style', type: 'json')]
    private array $visualStyle = [];

    #[ORM\Column(name: 'display_order', type: 'integer')]
    private int $displayOrder = 0;

    public function __construct()
    {
        $this->id = Uuid::v4();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getTierName(): string { return $this->tierName; }
    public function setTierName(string $tierName): static { $this->tierName = $tierName; return $this; }
    public function getMinPoints(): int { return $this->minPoints; }
    public function setMinPoints(int $minPoints): static { $this->minPoints = $minPoints; return $this; }
    public function getBenefits(): array { return $this->benefits; }
    public function setBenefits(array $benefits): static { $this->benefits = $benefits; return $this; }
    public function getVisualStyle(): array { return $this->visualStyle; }
    public function setVisualStyle(array $visualStyle): static { $this->visualStyle = $visualStyle; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $displayOrder): static { $this->displayOrder = $displayOrder; return $this; }
}
