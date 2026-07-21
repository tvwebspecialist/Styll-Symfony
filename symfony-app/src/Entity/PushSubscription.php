<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\PushSubscriptionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: PushSubscriptionRepository::class)]
#[ORM\Table(name: 'push_subscriptions')]
#[ORM\UniqueConstraint(name: 'push_subscriptions_endpoint_key', columns: ['endpoint'])]
#[ORM\Index(name: 'idx_push_subscriptions_profile', columns: ['profile_id'])]
#[ORM\Index(name: 'idx_push_subscriptions_tenant', columns: ['tenant_id'])]
class PushSubscription
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?Tenant $tenant = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Profile $profile;

    #[ORM\Column(type: 'text')]
    private string $endpoint;

    #[ORM\Column(name: 'p256dh_key', type: 'text')]
    private string $p256dhKey;

    #[ORM\Column(name: 'auth_key', type: 'text')]
    private string $authKey;

    #[ORM\Column(name: 'user_agent', type: 'text', nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(name: 'device_label', type: 'string', length: 255, nullable: true)]
    private ?string $deviceLabel = null;

    #[ORM\Column(name: 'last_used_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastUsedAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): ?Tenant { return $this->tenant; }
    public function setTenant(?Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getProfile(): Profile { return $this->profile; }
    public function setProfile(Profile $profile): static { $this->profile = $profile; return $this; }
    public function getEndpoint(): string { return $this->endpoint; }
    public function setEndpoint(string $endpoint): static { $this->endpoint = $endpoint; return $this; }
    public function getP256dhKey(): string { return $this->p256dhKey; }
    public function setP256dhKey(string $p256dhKey): static { $this->p256dhKey = $p256dhKey; return $this; }
    public function getAuthKey(): string { return $this->authKey; }
    public function setAuthKey(string $authKey): static { $this->authKey = $authKey; return $this; }
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $userAgent): static { $this->userAgent = $userAgent; return $this; }
    public function getDeviceLabel(): ?string { return $this->deviceLabel; }
    public function setDeviceLabel(?string $deviceLabel): static { $this->deviceLabel = $deviceLabel; return $this; }
    public function getLastUsedAt(): ?\DateTimeImmutable { return $this->lastUsedAt; }
    public function setLastUsedAt(?\DateTimeImmutable $lastUsedAt): static { $this->lastUsedAt = $lastUsedAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
