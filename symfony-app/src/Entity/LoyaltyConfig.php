<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LoyaltyConfigRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: LoyaltyConfigRepository::class)]
#[ORM\Table(name: 'loyalty_configs')]
#[ORM\HasLifecycleCallbacks]
class LoyaltyConfig
{
    public const TEMPLATE_CLASSIC = 'classic';
    public const TEMPLATE_STREAK_MASTER = 'streak_master';
    public const TEMPLATE_VIP_CLUB = 'vip_club';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(name: 'is_active', type: 'boolean')]
    private bool $isActive = true;

    #[ORM\Column(type: 'string', length: 30)]
    private string $template = self::TEMPLATE_CLASSIC;

    #[ORM\Column(name: 'points_per_visit', type: 'integer', nullable: true)]
    private ?int $pointsPerVisit = 100;

    #[ORM\Column(name: 'points_per_euro', type: 'integer', nullable: true)]
    private ?int $pointsPerEuro = null;

    #[ORM\Column(name: 'streak_threshold_days', type: 'integer')]
    private int $streakThresholdDays = 45;

    #[ORM\Column(type: 'integer')]
    private int $version = 1;

    #[ORM\Column(name: 'started_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $startedAt;

    #[ORM\Column(name: 'ended_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $endedAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->startedAt = new \DateTimeImmutable();
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
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): static { $this->isActive = $isActive; return $this; }
    public function getTemplate(): string { return $this->template; }
    public function setTemplate(string $template): static { $this->template = $template; return $this; }
    public function getPointsPerVisit(): ?int { return $this->pointsPerVisit; }
    public function setPointsPerVisit(?int $pointsPerVisit): static { $this->pointsPerVisit = $pointsPerVisit; return $this; }
    public function getPointsPerEuro(): ?int { return $this->pointsPerEuro; }
    public function setPointsPerEuro(?int $pointsPerEuro): static { $this->pointsPerEuro = $pointsPerEuro; return $this; }
    public function getStreakThresholdDays(): int { return $this->streakThresholdDays; }
    public function setStreakThresholdDays(int $streakThresholdDays): static { $this->streakThresholdDays = $streakThresholdDays; return $this; }
    public function getVersion(): int { return $this->version; }
    public function setVersion(int $version): static { $this->version = $version; return $this; }
    public function getStartedAt(): \DateTimeImmutable { return $this->startedAt; }
    public function setStartedAt(\DateTimeImmutable $startedAt): static { $this->startedAt = $startedAt; return $this; }
    public function getEndedAt(): ?\DateTimeImmutable { return $this->endedAt; }
    public function setEndedAt(?\DateTimeImmutable $endedAt): static { $this->endedAt = $endedAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
