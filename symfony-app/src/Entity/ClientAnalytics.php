<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientAnalyticsRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * Read-only pre-computed analytics for a client.
 * Values are populated by a background aggregation pipeline (not by this API).
 */
#[ORM\Entity(repositoryClass: ClientAnalyticsRepository::class)]
#[ORM\Table(name: 'client_analytics')]
class ClientAnalytics
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['client_analytics:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\OneToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Client $client;

    #[ORM\Column(name: 'total_visits', type: 'integer')]
    #[Groups(['client_analytics:read'])]
    private int $totalVisits = 0;

    #[ORM\Column(name: 'total_spent_services', type: 'decimal', precision: 12, scale: 2)]
    #[Groups(['client_analytics:read'])]
    private string $totalSpentServices = '0.00';

    #[ORM\Column(name: 'total_spent_products', type: 'decimal', precision: 12, scale: 2)]
    #[Groups(['client_analytics:read'])]
    private string $totalSpentProducts = '0.00';

    #[ORM\Column(name: 'average_spend_per_visit', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    #[Groups(['client_analytics:read'])]
    private ?string $averageSpendPerVisit = null;

    #[ORM\Column(name: 'last_visit_date', type: 'date_immutable', nullable: true)]
    #[Groups(['client_analytics:read'])]
    private ?\DateTimeImmutable $lastVisitDate = null;

    #[ORM\Column(name: 'days_since_last_visit', type: 'integer', nullable: true)]
    #[Groups(['client_analytics:read'])]
    private ?int $daysSinceLastVisit = null;

    #[ORM\Column(name: 'average_days_between_visits', type: 'decimal', precision: 8, scale: 2, nullable: true)]
    #[Groups(['client_analytics:read'])]
    private ?string $averageDaysBetweenVisits = null;

    #[ORM\Column(name: 'churn_status', type: 'string', length: 10)]
    #[Groups(['client_analytics:read'])]
    private string $churnStatus = 'green';

    #[ORM\Column(name: 'vip_score', type: 'integer')]
    #[Groups(['client_analytics:read'])]
    private int $vipScore = 0;

    #[ORM\Column(name: 'no_show_count', type: 'integer')]
    #[Groups(['client_analytics:read'])]
    private int $noShowCount = 0;

    #[ORM\Column(name: 'cancellation_count', type: 'integer')]
    #[Groups(['client_analytics:read'])]
    private int $cancellationCount = 0;

    #[ORM\Column(name: 'referral_count', type: 'integer')]
    #[Groups(['client_analytics:read'])]
    private int $referralCount = 0;

    #[ORM\Column(name: 'last_reconciled_at', type: 'datetimetz_immutable', nullable: true)]
    #[Groups(['client_analytics:read'])]
    private ?\DateTimeImmutable $lastReconciledAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    #[Groups(['client_analytics:read'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    #[Groups(['client_analytics:read'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function getClient(): Client { return $this->client; }
    public function getTotalVisits(): int { return $this->totalVisits; }
    public function getTotalSpentServices(): string { return $this->totalSpentServices; }
    public function getTotalSpentProducts(): string { return $this->totalSpentProducts; }
    public function getAverageSpendPerVisit(): ?string { return $this->averageSpendPerVisit; }
    public function getLastVisitDate(): ?\DateTimeImmutable { return $this->lastVisitDate; }
    public function getDaysSinceLastVisit(): ?int { return $this->daysSinceLastVisit; }
    public function getAverageDaysBetweenVisits(): ?string { return $this->averageDaysBetweenVisits; }
    public function getChurnStatus(): string { return $this->churnStatus; }
    public function getVipScore(): int { return $this->vipScore; }
    public function getNoShowCount(): int { return $this->noShowCount; }
    public function getCancellationCount(): int { return $this->cancellationCount; }
    public function getReferralCount(): int { return $this->referralCount; }
    public function getLastReconciledAt(): ?\DateTimeImmutable { return $this->lastReconciledAt; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
