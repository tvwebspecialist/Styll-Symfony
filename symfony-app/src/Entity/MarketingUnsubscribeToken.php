<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\MarketingUnsubscribeTokenRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: MarketingUnsubscribeTokenRepository::class)]
#[ORM\Table(name: 'marketing_unsubscribe_tokens')]
#[ORM\UniqueConstraint(name: 'marketing_unsubscribe_tokens_token_hash_key', columns: ['token_hash'])]
#[ORM\Index(name: 'idx_marketing_unsubscribe_tokens_lookup', columns: ['tenant_id', 'token_hash'])]
#[ORM\Index(name: 'idx_marketing_unsubscribe_tokens_expires_at', columns: ['expires_at'])]
class MarketingUnsubscribeToken
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Client $client;

    #[ORM\Column(name: 'token_hash', type: 'text')]
    private string $tokenHash;

    #[ORM\Column(name: 'expires_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(name: 'consumed_at', type: 'datetimetz_immutable', nullable: true)]
    private ?\DateTimeImmutable $consumedAt = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
        $this->expiresAt = $this->createdAt->modify('+30 days');
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getTokenHash(): string { return $this->tokenHash; }
    public function setTokenHash(string $tokenHash): static { $this->tokenHash = $tokenHash; return $this; }
    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): static { $this->expiresAt = $expiresAt; return $this; }
    public function getConsumedAt(): ?\DateTimeImmutable { return $this->consumedAt; }
    public function setConsumedAt(?\DateTimeImmutable $consumedAt): static { $this->consumedAt = $consumedAt; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
