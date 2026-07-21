<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientPrivacyRequestRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ClientPrivacyRequestRepository::class)]
#[ORM\Table(name: 'client_privacy_requests')]
#[ORM\Index(name: 'idx_client_privacy_requests_tenant_profile_timeline', columns: ['tenant_id', 'profile_id', 'created_at'])]
#[ORM\Index(name: 'idx_client_privacy_requests_tenant_client_timeline', columns: ['tenant_id', 'client_id', 'created_at'])]
class ClientPrivacyRequest
{
    public const ACTION_ACCESS_EXPORT = 'access_export';
    public const ACTION_ACCESS_REVIEW = 'access_review';
    public const ACTION_RECTIFICATION = 'rectification';
    public const ACTION_ERASURE = 'erasure';
    public const ACTION_RESTRICTION = 'restriction';

    public const STATUS_COMPLETED = 'completed';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_REJECTED = 'rejected';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Client $client = null;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Profile $profile = null;

    #[ORM\Column(type: 'string', length: 30)]
    private string $action;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status;

    #[ORM\Column(type: 'json', options: ['default' => '{}'])]
    private array $details = [];

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): static { $this->client = $client; return $this; }
    public function getProfile(): ?Profile { return $this->profile; }
    public function setProfile(?Profile $profile): static { $this->profile = $profile; return $this; }
    public function getAction(): string { return $this->action; }
    public function setAction(string $action): static { $this->action = $action; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static { $this->status = $status; return $this; }
    public function getDetails(): array { return $this->details; }
    public function setDetails(array $details): static { $this->details = $details; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
