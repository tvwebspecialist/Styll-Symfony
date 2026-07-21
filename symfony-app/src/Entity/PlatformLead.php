<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PlatformLeadRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: PlatformLeadRepository::class)]
#[ORM\Table(name: 'platform_leads')]
#[ORM\UniqueConstraint(name: 'uq_platform_leads_email', columns: ['email'])]
#[ORM\Index(name: 'idx_platform_leads_status', columns: ['status'])]
#[ORM\Index(name: 'idx_platform_leads_created', columns: ['created_at'])]
#[ORM\HasLifecycleCallbacks]
class PlatformLead
{
    public const SOURCE_TRIAL_SIGNUP = 'trial_signup';
    public const SOURCE_DEMO_REQUEST = 'demo_request';
    public const SOURCE_CONTENT_DOWNLOAD = 'content_download';
    public const SOURCE_CHAT = 'chat';

    public const STATUS_NEW = 'new';
    public const STATUS_CONTACTED = 'contacted';
    public const STATUS_QUALIFIED = 'qualified';
    public const STATUS_CONVERTED = 'converted';
    public const STATUS_LOST = 'lost';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'text')]
    private string $email;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(name: 'business_name', type: 'text', nullable: true)]
    private ?string $businessName = null;

    #[ORM\Column(type: 'string', length: 40, options: ['default' => self::SOURCE_TRIAL_SIGNUP])]
    private string $source = self::SOURCE_TRIAL_SIGNUP;

    #[ORM\Column(name: 'posthog_distinct_id', type: 'text', nullable: true)]
    private ?string $posthogDistinctId = null;

    #[ORM\Column(name: 'consent_marketing', type: 'boolean', options: ['default' => false])]
    private bool $consentMarketing = false;

    #[ORM\Column(name: 'consent_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $consentAt = null;

    #[ORM\Column(type: 'string', length: 30, options: ['default' => self::STATUS_NEW])]
    private string $status = self::STATUS_NEW;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'converted_tenant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Tenant $convertedTenant = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): static { $this->email = $email; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): static { $this->phone = $phone; return $this; }
    public function getBusinessName(): ?string { return $this->businessName; }
    public function setBusinessName(?string $businessName): static { $this->businessName = $businessName; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getPosthogDistinctId(): ?string { return $this->posthogDistinctId; }
    public function setPosthogDistinctId(?string $posthogDistinctId): static { $this->posthogDistinctId = $posthogDistinctId; return $this; }
    public function hasConsentMarketing(): bool { return $this->consentMarketing; }
    public function setConsentMarketing(bool $consentMarketing): static { $this->consentMarketing = $consentMarketing; return $this; }
    public function getConsentAt(): ?\DateTimeImmutable { return $this->consentAt; }
    public function setConsentAt(?\DateTimeImmutable $consentAt): static { $this->consentAt = $consentAt; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getConvertedTenant(): ?Tenant { return $this->convertedTenant; }
    public function setConvertedTenant(?Tenant $convertedTenant): static { $this->convertedTenant = $convertedTenant; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
