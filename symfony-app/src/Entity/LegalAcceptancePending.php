<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LegalAcceptancePendingRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: LegalAcceptancePendingRepository::class)]
#[ORM\Table(name: 'legal_acceptance_pending')]
#[ORM\UniqueConstraint(name: 'legal_acceptance_pending_token_hash_key', columns: ['token_hash'])]
#[ORM\Index(name: 'legal_acceptance_pending_expires_at_idx', columns: ['expires_at'])]
#[ORM\Index(name: 'legal_acceptance_pending_source_idx', columns: ['source', 'accepted_at'])]
class LegalAcceptancePending
{
    public const DOCUMENT_TYPE_B2B_TERMS = 'B2B_TERMS';

    public const SOURCE_EMAIL_PASSWORD_REGISTER = 'EMAIL_PASSWORD_REGISTER';
    public const SOURCE_GOOGLE_OAUTH_REGISTER = 'GOOGLE_OAUTH_REGISTER';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(name: 'token_hash', type: 'text')]
    private string $tokenHash;

    #[ORM\Column(name: 'context_token_hash', type: 'text', nullable: true)]
    private ?string $contextTokenHash = null;

    #[ORM\Column(type: 'string', length: 40)]
    private string $source;

    #[ORM\Column(name: 'document_type', type: 'string', length: 30)]
    private string $documentType;

    #[ORM\Column(name: 'document_version', type: 'text')]
    private string $documentVersion;

    #[ORM\Column(name: 'privacy_notice_version', type: 'text')]
    private string $privacyNoticeVersion;

    #[ORM\Column(name: 'accepted_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $acceptedAt;

    #[ORM\Column(name: 'accepted_by_email', type: 'text', nullable: true)]
    private ?string $acceptedByEmail = null;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $metadata = [];

    #[ORM\Column(name: 'expires_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'consumed_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $consumedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'consumed_by_user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $consumedByUser = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->acceptedAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
        $this->expiresAt = $this->acceptedAt->modify('+30 minutes');
    }

    public function getId(): Uuid { return $this->id; }
    public function getTokenHash(): string { return $this->tokenHash; }
    public function setTokenHash(string $tokenHash): static { $this->tokenHash = $tokenHash; return $this; }
    public function getContextTokenHash(): ?string { return $this->contextTokenHash; }
    public function setContextTokenHash(?string $contextTokenHash): static { $this->contextTokenHash = $contextTokenHash; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getDocumentType(): string { return $this->documentType; }
    public function setDocumentType(string $documentType): static { $this->documentType = $documentType; return $this; }
    public function getDocumentVersion(): string { return $this->documentVersion; }
    public function setDocumentVersion(string $documentVersion): static { $this->documentVersion = $documentVersion; return $this; }
    public function getPrivacyNoticeVersion(): string { return $this->privacyNoticeVersion; }
    public function setPrivacyNoticeVersion(string $privacyNoticeVersion): static { $this->privacyNoticeVersion = $privacyNoticeVersion; return $this; }
    public function getAcceptedAt(): \DateTimeImmutable { return $this->acceptedAt; }
    public function setAcceptedAt(\DateTimeImmutable $acceptedAt): static { $this->acceptedAt = $acceptedAt; return $this; }
    public function getAcceptedByEmail(): ?string { return $this->acceptedByEmail; }
    public function setAcceptedByEmail(?string $acceptedByEmail): static { $this->acceptedByEmail = $acceptedByEmail; return $this; }
    public function getMetadata(): array { return $this->metadata; }
    public function setMetadata(array $metadata): static { $this->metadata = $metadata; return $this; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): static { $this->expiresAt = $expiresAt; return $this; }
    public function getConsumedAt(): ?\DateTimeImmutable { return $this->consumedAt; }
    public function setConsumedAt(?\DateTimeImmutable $consumedAt): static { $this->consumedAt = $consumedAt; return $this; }
    public function getConsumedByUser(): ?User { return $this->consumedByUser; }
    public function setConsumedByUser(?User $consumedByUser): static { $this->consumedByUser = $consumedByUser; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
