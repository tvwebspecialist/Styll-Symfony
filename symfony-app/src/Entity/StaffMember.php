<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffMemberRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: StaffMemberRepository::class)]
#[ORM\Table(name: 'staff_members')]
#[ORM\HasLifecycleCallbacks]
class StaffMember
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\ManyToOne(targetEntity: Profile::class)]
    #[ORM\JoinColumn(name: 'profile_id', referencedColumnName: 'id', nullable: false)]
    private Profile $profile;

    #[ORM\Column(type: 'string', length: 20)]
    private string $role = 'staff';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(name: 'photo_url', type: 'string', length: 500, nullable: true)]
    private ?string $photoUrl = null;

    #[ORM\Column(name: 'notification_preferences', type: 'json')]
    private array $notificationPreferences = [];

    #[ORM\Column(name: 'is_active', type: 'boolean')]
    private bool $isActive = true;

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
    public function getProfile(): Profile { return $this->profile; }
    public function setProfile(Profile $profile): static { $this->profile = $profile; return $this; }
    public function getRole(): string { return $this->role; }
    public function setRole(string $role): static { $this->role = $role; return $this; }
    public function getBio(): ?string { return $this->bio; }
    public function setBio(?string $bio): static { $this->bio = $bio; return $this; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $url): static { $this->photoUrl = $url; return $this; }
    public function getNotificationPreferences(): array { return $this->notificationPreferences; }
    public function setNotificationPreferences(array $prefs): static { $this->notificationPreferences = $prefs; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): static { $this->isActive = $v; return $this; }
    public function getDeletedAt(): ?\DateTimeImmutable { return $this->deletedAt; }
    public function setDeletedAt(?\DateTimeImmutable $d): static { $this->deletedAt = $d; return $this; }
    public function getDeletedBy(): ?Profile { return $this->deletedBy; }
    public function setDeletedBy(?Profile $p): static { $this->deletedBy = $p; return $this; }
    public function getCreatedBy(): ?Profile { return $this->createdBy; }
    public function setCreatedBy(?Profile $p): static { $this->createdBy = $p; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
