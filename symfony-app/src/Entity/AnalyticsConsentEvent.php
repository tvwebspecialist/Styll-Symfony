<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AnalyticsConsentEventRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AnalyticsConsentEventRepository::class)]
#[ORM\Table(name: 'analytics_consent_events')]
#[ORM\Index(name: 'idx_analytics_consent_host_surface_anon_timeline', columns: ['host', 'surface', 'anonymous_id', 'occurred_at', 'created_at'])]
#[ORM\Index(name: 'idx_analytics_consent_surface_timeline', columns: ['surface', 'occurred_at'])]
class AnalyticsConsentEvent
{
    public const SURFACE_PLATFORM = 'PLATFORM';
    public const SURFACE_TENANT_WEBSITE = 'TENANT_WEBSITE';
    public const SURFACE_TENANT_PWA = 'TENANT_PWA';
    public const SURFACE_TENANT_DASHBOARD = 'TENANT_DASHBOARD';

    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    public const SOURCE_BANNER = 'BANNER';
    public const SOURCE_PREFERENCES_CENTER = 'PREFERENCES_CENTER';
    public const SOURCE_COOKIE_POLICY = 'COOKIE_POLICY';
    public const SOURCE_LOCAL_STORAGE_MIGRATION = 'LOCAL_STORAGE_MIGRATION';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'anonymous_id', type: 'text')]
    private string $anonymousId;

    #[ORM\Column(type: 'text')]
    private string $host;

    #[ORM\Column(type: 'string', length: 30)]
    private string $surface;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status;

    #[ORM\Column(name: 'policy_version', type: 'text')]
    private string $policyVersion;

    #[ORM\Column(name: 'occurred_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $occurredAt;

    #[ORM\Column(name: 'ip_address', type: 'string', nullable: true, columnDefinition: 'INET DEFAULT NULL')]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'user_agent', type: 'text', nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(type: 'string', length: 40)]
    private string $source;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $metadata = [];

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->occurredAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getAnonymousId(): string { return $this->anonymousId; }
    public function setAnonymousId(string $anonymousId): static { $this->anonymousId = $anonymousId; return $this; }
    public function getHost(): string { return $this->host; }
    public function setHost(string $host): static { $this->host = $host; return $this; }
    public function getSurface(): string { return $this->surface; }
    public function setSurface(string $surface): static { $this->surface = $surface; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getPolicyVersion(): string { return $this->policyVersion; }
    public function setPolicyVersion(string $policyVersion): static { $this->policyVersion = $policyVersion; return $this; }
    public function getOccurredAt(): \DateTimeImmutable { return $this->occurredAt; }
    public function setOccurredAt(\DateTimeImmutable $occurredAt): static { $this->occurredAt = $occurredAt; return $this; }
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $ipAddress): static { $this->ipAddress = $ipAddress; return $this; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $userAgent): static { $this->userAgent = $userAgent; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getMetadata(): array { return $this->metadata; }
    public function setMetadata(array $metadata): static { $this->metadata = $metadata; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
