<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LegalAcceptanceEventRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: LegalAcceptanceEventRepository::class)]
#[ORM\Table(name: 'legal_acceptance_events')]
#[ORM\UniqueConstraint(name: 'legal_acceptance_events_user_document_version_idx', columns: ['user_id', 'document_type', 'document_version'])]
#[ORM\Index(name: 'legal_acceptance_events_user_timeline_idx', columns: ['user_id', 'accepted_at', 'created_at'])]
#[ORM\Index(name: 'legal_acceptance_events_tenant_timeline_idx', columns: ['tenant_id', 'accepted_at', 'created_at'])]
class LegalAcceptanceEvent
{
    public const DOCUMENT_TYPE_B2B_TERMS = 'B2B_TERMS';

    public const SOURCE_EMAIL_PASSWORD_REGISTER = 'EMAIL_PASSWORD_REGISTER';
    public const SOURCE_GOOGLE_OAUTH_REGISTER = 'GOOGLE_OAUTH_REGISTER';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Tenant $tenant = null;

    #[ORM\Column(name: 'document_type', type: 'string', length: 30)]
    private string $documentType;

    #[ORM\Column(name: 'document_version', type: 'text')]
    private string $documentVersion;

    #[ORM\Column(name: 'privacy_notice_version', type: 'text')]
    private string $privacyNoticeVersion;

    #[ORM\Column(name: 'accepted_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $acceptedAt;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'accepted_by', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Profile $acceptedBy;

    #[ORM\Column(type: 'string', length: 40)]
    private string $source;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $metadata = [];

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->acceptedAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function setUser(User $user): static { $this->user = $user; return $this; }
    public function getProfile(): Profile { return $this->profile; }
    public function setProfile(Profile $profile): static { $this->profile = $profile; return $this; }
    public function getTenant(): ?Tenant { return $this->tenant; }
    public function setTenant(?Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getDocumentType(): string { return $this->documentType; }
    public function setDocumentType(string $documentType): static { $this->documentType = $documentType; return $this; }
    public function getDocumentVersion(): string { return $this->documentVersion; }
    public function setDocumentVersion(string $documentVersion): static { $this->documentVersion = $documentVersion; return $this; }
    public function getPrivacyNoticeVersion(): string { return $this->privacyNoticeVersion; }
    public function setPrivacyNoticeVersion(string $privacyNoticeVersion): static { $this->privacyNoticeVersion = $privacyNoticeVersion; return $this; }
    public function getAcceptedAt(): \DateTimeImmutable { return $this->acceptedAt; }
    public function setAcceptedAt(\DateTimeImmutable $acceptedAt): static { $this->acceptedAt = $acceptedAt; return $this; }
    public function getAcceptedBy(): Profile { return $this->acceptedBy; }
    public function setAcceptedBy(Profile $acceptedBy): static { $this->acceptedBy = $acceptedBy; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getMetadata(): array { return $this->metadata; }
    public function setMetadata(array $metadata): static { $this->metadata = $metadata; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
