<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\RewardRedemptionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: RewardRedemptionRepository::class)]
#[ORM\Table(name: 'reward_redemptions')]
class RewardRedemption
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false)]
    private Client $client;

    #[ORM\ManyToOne(targetEntity: Reward::class)]
    #[ORM\JoinColumn(name: 'reward_id', referencedColumnName: 'id', nullable: false)]
    private Reward $reward;

    #[ORM\Column(name: 'points_spent', type: 'integer')]
    private int $pointsSpent;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'confirmed_by', referencedColumnName: 'id', nullable: true)]
    private ?StaffMember $confirmedBy = null;

    #[ORM\Column(name: 'confirmed_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $confirmedAt = null;

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
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getReward(): Reward { return $this->reward; }
    public function setReward(Reward $reward): static { $this->reward = $reward; return $this; }
    public function getPointsSpent(): int { return $this->pointsSpent; }
    public function setPointsSpent(int $pointsSpent): static { $this->pointsSpent = $pointsSpent; return $this; }
    public function getConfirmedBy(): ?StaffMember { return $this->confirmedBy; }
    public function setConfirmedBy(?StaffMember $confirmedBy): static { $this->confirmedBy = $confirmedBy; return $this; }
    public function getConfirmedAt(): ?\DateTimeImmutable { return $this->confirmedAt; }
    public function setConfirmedAt(?\DateTimeImmutable $confirmedAt): static { $this->confirmedAt = $confirmedAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
