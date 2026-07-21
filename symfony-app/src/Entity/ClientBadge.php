<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientBadgeRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ClientBadgeRepository::class)]
#[ORM\Table(name: 'client_badges')]
#[ORM\UniqueConstraint(name: 'uniq_client_badge', columns: ['client_id', 'badge_id'])]
class ClientBadge
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

    #[ORM\ManyToOne(targetEntity: Badge::class)]
    #[ORM\JoinColumn(name: 'badge_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Badge $badge;

    #[ORM\Column(name: 'unlocked_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $unlockedAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->unlockedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getBadge(): Badge { return $this->badge; }
    public function setBadge(Badge $badge): static { $this->badge = $badge; return $this; }
    public function getUnlockedAt(): \DateTimeImmutable { return $this->unlockedAt; }
    public function setUnlockedAt(\DateTimeImmutable $unlockedAt): static { $this->unlockedAt = $unlockedAt; return $this; }
}
