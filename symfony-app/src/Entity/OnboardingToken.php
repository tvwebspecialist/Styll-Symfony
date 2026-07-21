<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\OnboardingTokenRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: OnboardingTokenRepository::class)]
#[ORM\Table(name: 'onboarding_tokens')]
#[ORM\UniqueConstraint(name: 'onboarding_tokens_token_key', columns: ['token'])]
#[ORM\Index(name: 'idx_onboarding_tokens_token', columns: ['token'])]
#[ORM\Index(name: 'idx_onboarding_tokens_active', columns: ['active', 'expires_at'])]
#[ORM\Index(name: 'idx_onboarding_tokens_created_by', columns: ['created_by', 'created_at'])]
class OnboardingToken
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(type: 'string', length: 32)]
    private string $token;

    #[ORM\Column(name: 'barbiere_email', type: 'string', length: 255, nullable: true)]
    private ?string $barbiereEmail = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $createdBy = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'expires_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'used_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $usedAt = null;

    #[ORM\Column(name: 'used_by_email', type: 'string', length: 255, nullable: true)]
    private ?string $usedByEmail = null;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $active = true;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->expiresAt = $this->createdAt->modify('+30 days');
    }

    public function getId(): Uuid { return $this->id; }
    public function getToken(): string { return $this->token; }
    public function setToken(string $token): static { $this->token = $token; return $this; }
    public function getBarbiereEmail(): ?string { return $this->barbiereEmail; }
    public function setBarbiereEmail(?string $barbiereEmail): static { $this->barbiereEmail = $barbiereEmail; return $this; }
    public function getCreatedBy(): ?Profile { return $this->createdBy; }
    public function setCreatedBy(?Profile $createdBy): static { $this->createdBy = $createdBy; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): static { $this->expiresAt = $expiresAt; return $this; }
    public function getUsedAt(): ?\DateTimeImmutable { return $this->usedAt; }
    public function setUsedAt(?\DateTimeImmutable $usedAt): static { $this->usedAt = $usedAt; return $this; }
    public function getUsedByEmail(): ?string { return $this->usedByEmail; }
    public function setUsedByEmail(?string $usedByEmail): static { $this->usedByEmail = $usedByEmail; return $this; }
    public function isActive(): bool { return $this->active; }
    public function setActive(bool $active): static { $this->active = $active; return $this; }
}
