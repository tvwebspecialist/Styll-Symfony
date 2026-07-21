<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\LoyaltyTransactionRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: LoyaltyTransactionRepository::class)]
#[ORM\Table(name: 'loyalty_transactions')]
class LoyaltyTransaction
{
    public const TYPE_EARN = 'earn';
    public const TYPE_REDEEM = 'redeem';
    public const TYPE_BONUS = 'bonus';
    public const TYPE_IMPORT = 'import';
    public const TYPE_EXPIRE = 'expire';
    public const TYPE_ADJUSTMENT = 'adjustment';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(name: 'client_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Client $client;

    #[ORM\Column(type: 'string', length: 30)]
    private string $type;

    #[ORM\Column(type: 'integer')]
    private int $points;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\ManyToOne(targetEntity: Appointment::class)]
    #[ORM\JoinColumn(name: 'appointment_id', referencedColumnName: 'id', nullable: true)]
    private ?Appointment $appointment = null;

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: true)]
    private ?StaffMember $staff = null;

    #[ORM\Column(name: 'loyalty_config_version', type: 'integer', nullable: true)]
    private ?int $loyaltyConfigVersion = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->id = Uuid::v4();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getClient(): Client { return $this->client; }
    public function setClient(Client $client): static { $this->client = $client; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }
    public function getPoints(): int { return $this->points; }
    public function setPoints(int $points): static { $this->points = $points; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getAppointment(): ?Appointment { return $this->appointment; }
    public function setAppointment(?Appointment $appointment): static { $this->appointment = $appointment; return $this; }
    public function getStaff(): ?StaffMember { return $this->staff; }
    public function setStaff(?StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getLoyaltyConfigVersion(): ?int { return $this->loyaltyConfigVersion; }
    public function setLoyaltyConfigVersion(?int $loyaltyConfigVersion): static { $this->loyaltyConfigVersion = $loyaltyConfigVersion; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
