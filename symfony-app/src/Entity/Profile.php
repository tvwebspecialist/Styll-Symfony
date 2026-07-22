<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ProfileRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ProfileRepository::class)]
#[ORM\Table(name: 'profiles')]
#[ORM\HasLifecycleCallbacks]
class Profile
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid')]
    private Uuid $id;

    #[ORM\OneToOne(inversedBy: 'profile', targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(name: 'user_type', type: 'string', length: 20)]
    private string $userType = 'staff';

    #[ORM\Column(name: 'full_name', type: 'string', length: 255, nullable: true)]
    private ?string $fullName = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(name: 'avatar_url', type: 'string', length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $bio = null;

    #[ORM\Column(type: 'string', length: 10, nullable: true)]
    private ?string $language = 'it';

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $timezone = 'Europe/Rome';

    #[ORM\Column(name: 'notification_preferences', type: 'json')]
    private array $notificationPreferences = [];

    #[ORM\Column(name: 'onboarding_completed', type: 'boolean')]
    private bool $onboardingCompleted = false;

    #[ORM\Column(name: 'is_superadmin', type: 'boolean')]
    private bool $isSuperadmin = false;

    #[ORM\Column(name: 'work_mode', type: 'string', length: 10, nullable: true)]
    private ?string $workMode = null;

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $user)
    {
        $this->id = $user->getId();
        $this->user = $user;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function getUserType(): string { return $this->userType; }
    public function setUserType(string $userType): static { $this->userType = $userType; return $this; }
    public function getFullName(): ?string { return $this->fullName; }
    public function setFullName(?string $fullName): static { $this->fullName = $fullName; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): static { $this->email = $email; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): static { $this->phone = $phone; return $this; }
    public function getAvatarUrl(): ?string { return $this->avatarUrl; }
    public function setAvatarUrl(?string $avatarUrl): static { $this->avatarUrl = $avatarUrl; return $this; }
    public function getBio(): ?string { return $this->bio; }
    public function setBio(?string $bio): static { $this->bio = $bio; return $this; }
    public function getLanguage(): ?string { return $this->language; }
    public function setLanguage(?string $language): static { $this->language = $language; return $this; }
    public function getTimezone(): ?string { return $this->timezone; }
    public function setTimezone(?string $timezone): static { $this->timezone = $timezone; return $this; }
    public function getNotificationPreferences(): array { return $this->notificationPreferences; }
    public function setNotificationPreferences(array $prefs): static { $this->notificationPreferences = $prefs; return $this; }
    public function isOnboardingCompleted(): bool { return $this->onboardingCompleted; }
    public function setOnboardingCompleted(bool $v): static { $this->onboardingCompleted = $v; return $this; }
    public function isSuperadmin(): bool { return $this->isSuperadmin; }
    public function setIsSuperadmin(bool $v): static { $this->isSuperadmin = $v; return $this; }
    public function getWorkMode(): ?string { return $this->workMode; }
    public function setWorkMode(?string $workMode): static { $this->workMode = $workMode; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
