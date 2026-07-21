<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientLoyaltyRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ClientLoyaltyRepository::class)]
#[ORM\Table(name: 'client_loyalty')]
#[ORM\UniqueConstraint(name: 'uniq_tenant_client_loyalty', columns: ['tenant_id', 'client_id'])]
#[ORM\HasLifecycleCallbacks]
class ClientLoyalty
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

    #[ORM\Column(name: 'total_points', type: 'integer')]
    private int $totalPoints = 0;

    #[ORM\Column(name: 'available_points', type: 'integer')]
    private int $availablePoints = 0;

    #[ORM\Column(name: 'current_streak', type: 'integer')]
    private int $currentStreak = 0;

    #[ORM\Column(name: 'longest_streak', type: 'integer')]
    private int $longestStreak = 0;

    #[ORM\Column(name: 'current_tier', type: 'string', length: 50)]
    private string $currentTier = 'bronze';

    #[ORM\Column(name: 'tier_slug', type: 'string', length: 100, nullable: true)]
    private ?string $tierSlug = null;

    #[ORM\Column(name: 'tier_points_this_year', type: 'integer')]
    private int $tierPointsThisYear = 0;

    #[ORM\Column(name: 'tier_year', type: 'integer')]
    private int $tierYear;

    #[ORM\Column(name: 'tier_grace_expires_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $tierGraceExpiresAt = null;

    #[ORM\Column(name: 'last_visit_date', type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastVisitDate = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->tierYear = (int) (new \DateTimeImmutable())->format('Y');
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
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getTotalPoints(): int { return $this->totalPoints; }
    public function setTotalPoints(int $totalPoints): static { $this->totalPoints = $totalPoints; return $this; }
    public function getAvailablePoints(): int { return $this->availablePoints; }
    public function setAvailablePoints(int $availablePoints): static { $this->availablePoints = $availablePoints; return $this; }
    public function getCurrentStreak(): int { return $this->currentStreak; }
    public function setCurrentStreak(int $currentStreak): static { $this->currentStreak = $currentStreak; return $this; }
    public function getLongestStreak(): int { return $this->longestStreak; }
    public function setLongestStreak(int $longestStreak): static { $this->longestStreak = $longestStreak; return $this; }
    public function getCurrentTier(): string { return $this->currentTier; }
    public function setCurrentTier(string $currentTier): static { $this->currentTier = $currentTier; return $this; }
    public function getTierSlug(): ?string { return $this->tierSlug; }
    public function setTierSlug(?string $tierSlug): static { $this->tierSlug = $tierSlug; return $this; }
    public function getTierPointsThisYear(): int { return $this->tierPointsThisYear; }
    public function setTierPointsThisYear(int $tierPointsThisYear): static { $this->tierPointsThisYear = $tierPointsThisYear; return $this; }
    public function getTierYear(): int { return $this->tierYear; }
    public function setTierYear(int $tierYear): static { $this->tierYear = $tierYear; return $this; }
    public function getTierGraceExpiresAt(): ?\DateTimeImmutable { return $this->tierGraceExpiresAt; }
    public function setTierGraceExpiresAt(?\DateTimeImmutable $tierGraceExpiresAt): static { $this->tierGraceExpiresAt = $tierGraceExpiresAt; return $this; }
    public function getLastVisitDate(): ?\DateTimeImmutable { return $this->lastVisitDate; }
    public function setLastVisitDate(?\DateTimeImmutable $lastVisitDate): static { $this->lastVisitDate = $lastVisitDate; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
