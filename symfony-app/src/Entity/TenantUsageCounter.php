<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TenantUsageCounterRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TenantUsageCounterRepository::class)]
#[ORM\Table(name: 'tenant_usage_counters')]
#[ORM\Index(name: 'idx_tenant_usage_counters_period_metric', columns: ['period_month', 'metric'])]
class TenantUsageCounter
{
    public const METRIC_SMS_SENT = 'sms_sent';
    public const METRIC_WHATSAPP_SENT = 'whatsapp_sent';
    public const METRIC_EMAIL_SENT = 'email_sent';
    public const METRIC_PUSH_SENT = 'push_sent';
    public const METRIC_AI_REQUESTS = 'ai_requests';
    public const METRIC_AI_INPUT_TOKENS = 'ai_input_tokens';
    public const METRIC_AI_OUTPUT_TOKENS = 'ai_output_tokens';

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Id]
    #[ORM\Column(name: 'period_month', type: 'string', columnDefinition: 'DATE NOT NULL')]
    private string $periodMonth;

    #[ORM\Id]
    #[ORM\Column(type: 'string', length: 40)]
    private string $metric;

    #[ORM\Column(type: 'bigint', options: ['default' => 0])]
    private string $count = '0';

    #[ORM\Column(name: 'cost_cents', type: 'bigint', options: ['default' => 0])]
    private string $costCents = '0';

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->periodMonth = (new \DateTimeImmutable('first day of this month'))->format('Y-m-d');
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getPeriodMonth(): string { return $this->periodMonth; }
    public function setPeriodMonth(string $periodMonth): static { $this->periodMonth = $periodMonth; return $this; }
    public function getMetric(): string { return $this->metric; }
    public function setMetric(string $metric): static { $this->metric = $metric; return $this; }
    public function getCount(): string { return $this->count; }
    public function setCount(string $count): static { $this->count = $count; return $this; }
    public function getCostCents(): string { return $this->costCents; }
    public function setCostCents(string $costCents): static { $this->costCents = $costCents; return $this; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static { $this->updatedAt = $updatedAt; return $this; }
}
