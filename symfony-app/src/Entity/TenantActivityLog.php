<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TenantActivityLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TenantActivityLogRepository::class)]
#[ORM\Table(name: 'tenant_activity_log')]
#[ORM\Index(name: 'idx_tenant_activity_log_tenant_recorded', columns: ['tenant_id', 'recorded_at'])]
class TenantActivityLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(name: 'last_login_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    #[ORM\Column(name: 'appointments_this_month', type: 'integer', options: ['default' => 0])]
    private int $appointmentsThisMonth = 0;

    #[ORM\Column(name: 'active_clients_count', type: 'integer', options: ['default' => 0])]
    private int $activeClientsCount = 0;

    #[ORM\Column(name: 'total_revenue_this_month', type: 'decimal', precision: 12, scale: 2, options: ['default' => '0'])]
    private string $totalRevenueThisMonth = '0';

    #[ORM\Column(name: 'recorded_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $recordedAt;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->recordedAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getLastLoginAt(): ?\DateTimeImmutable { return $this->lastLoginAt; }
    public function setLastLoginAt(?\DateTimeImmutable $lastLoginAt): static { $this->lastLoginAt = $lastLoginAt; return $this; }
    public function getAppointmentsThisMonth(): int { return $this->appointmentsThisMonth; }
    public function setAppointmentsThisMonth(int $appointmentsThisMonth): static { $this->appointmentsThisMonth = $appointmentsThisMonth; return $this; }
    public function getActiveClientsCount(): int { return $this->activeClientsCount; }
    public function setActiveClientsCount(int $activeClientsCount): static { $this->activeClientsCount = $activeClientsCount; return $this; }
    public function getTotalRevenueThisMonth(): string { return $this->totalRevenueThisMonth; }
    public function setTotalRevenueThisMonth(string $totalRevenueThisMonth): static { $this->totalRevenueThisMonth = $totalRevenueThisMonth; return $this; }
    public function getRecordedAt(): \DateTimeImmutable { return $this->recordedAt; }
    public function setRecordedAt(\DateTimeImmutable $recordedAt): static { $this->recordedAt = $recordedAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
