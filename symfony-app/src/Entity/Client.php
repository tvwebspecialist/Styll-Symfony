<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\ClientRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 5 — CRM: Client entity
 * Multi-tenant: every row belongs to one tenant. tenant_id is enforced by TenantFilter.
 */
#[ApiResource(
    operations: [
        new GetCollection(),
    ],
    normalizationContext: ['groups' => ['client:read']],
)]
#[ORM\Entity(repositoryClass: ClientRepository::class)]
#[ORM\Table(name: 'clients')]
#[ORM\UniqueConstraint(name: 'uniq_tenant_phone', columns: ['tenant_id', 'phone'])]
#[ORM\HasLifecycleCallbacks]
class Client
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['client:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: true)]
    private ?Profile $profile = null;

    #[ORM\Column(name: 'full_name', type: 'string', length: 255)]
    #[Groups(['client:read'])]
    private string $fullName;

    #[ORM\Column(type: 'string', length: 30)]
    #[Groups(['client:read'])]
    private string $phone;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Groups(['client:read'])]
    private ?string $email = null;

    #[ORM\Column(name: 'date_of_birth', type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\Column(name: 'preferred_contact_channel', type: 'string', length: 20, nullable: true)]
    private ?string $preferredContactChannel = 'sms';

    #[ORM\Column(name: 'marketing_consent', type: 'boolean')]
    private bool $marketingConsent = false;

    #[ORM\Column(name: 'avatar_url', type: 'string', length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(type: 'json')]
    private array $tags = [];

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'referred_by', referencedColumnName: 'id', nullable: true)]
    private ?Client $referredBy = null;

    #[ORM\Column(name: 'churn_opted_out', type: 'boolean')]
    private bool $churnOptedOut = false;

    #[ORM\Column(name: 'deleted_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $deletedAt = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'deleted_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $deletedBy = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: true)]
    private ?Profile $createdBy = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
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
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getProfile(): ?Profile { return $this->profile; }
    public function setProfile(?Profile $profile): static { $this->profile = $profile; return $this; }
    public function getFullName(): string { return $this->fullName; }
    public function setFullName(string $name): static { $this->fullName = $name; return $this; }
    public function getPhone(): string { return $this->phone; }
    public function setPhone(string $phone): static { $this->phone = $phone; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): static { $this->email = $email; return $this; }
    public function getDateOfBirth(): ?\DateTimeImmutable { return $this->dateOfBirth; }
    public function setDateOfBirth(?\DateTimeImmutable $d): static { $this->dateOfBirth = $d; return $this; }
    public function getPreferredContactChannel(): ?string { return $this->preferredContactChannel; }
    public function setPreferredContactChannel(?string $c): static { $this->preferredContactChannel = $c; return $this; }
    public function hasMarketingConsent(): bool { return $this->marketingConsent; }
    public function setMarketingConsent(bool $v): static { $this->marketingConsent = $v; return $this; }
    public function getAvatarUrl(): ?string { return $this->avatarUrl; }
    public function setAvatarUrl(?string $url): static { $this->avatarUrl = $url; return $this; }
    public function getTags(): array { return $this->tags; }
    public function setTags(array $tags): static { $this->tags = $tags; return $this; }
    public function getReferredBy(): ?Client { return $this->referredBy; }
    public function setReferredBy(?Client $c): static { $this->referredBy = $c; return $this; }
    public function isChurnOptedOut(): bool { return $this->churnOptedOut; }
    public function setChurnOptedOut(bool $v): static { $this->churnOptedOut = $v; return $this; }
    public function getDeletedAt(): ?\DateTimeImmutable { return $this->deletedAt; }
    public function setDeletedAt(?\DateTimeImmutable $d): static { $this->deletedAt = $d; return $this; }
    public function isDeleted(): bool { return $this->deletedAt !== null; }
    public function getDeletedBy(): ?Profile { return $this->deletedBy; }
    public function setDeletedBy(?Profile $p): static { $this->deletedBy = $p; return $this; }
    public function getCreatedBy(): ?Profile { return $this->createdBy; }
    public function setCreatedBy(?Profile $p): static { $this->createdBy = $p; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
