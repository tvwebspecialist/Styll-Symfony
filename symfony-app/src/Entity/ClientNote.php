<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ClientNoteRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * AREA 5 — CRM: Private staff notes on a client (NEVER visible to the client).
 */
#[ORM\Entity(repositoryClass: ClientNoteRepository::class)]
#[ORM\Table(name: 'client_notes')]
class ClientNote
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

    #[ORM\ManyToOne(targetEntity: StaffMember::class)]
    #[ORM\JoinColumn(name: 'staff_id', referencedColumnName: 'id', nullable: false)]
    private StaffMember $staff;

    #[ORM\Column(name: 'note_text', type: 'text')]
    private string $noteText;

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
    public function getStaff(): StaffMember { return $this->staff; }
    public function setStaff(StaffMember $staff): static { $this->staff = $staff; return $this; }
    public function getNoteText(): string { return $this->noteText; }
    public function setNoteText(string $text): static { $this->noteText = $text; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
