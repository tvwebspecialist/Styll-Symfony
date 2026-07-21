<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\LocationRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/locations',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new Get(
            uriTemplate: '/public/tenants/{slug}/locations/{id}',
            uriVariables: [
                'slug' => new Link(fromClass: Tenant::class, toProperty: 'tenant', identifiers: ['slug']),
                'id' => new Link(fromClass: Location::class),
            ],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
)]
#[ORM\Entity(repositoryClass: LocationRepository::class)]
#[ORM\Table(name: 'locations')]
#[ORM\HasLifecycleCallbacks]
class Location
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['public:read'])]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['public:read'])]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['public:read'])]
    private ?string $address = null;

    #[ORM\Column(type: 'string', length: 100, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $city = null;

    #[ORM\Column(name: 'zip_code', type: 'string', length: 20, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $zipCode = null;

    #[ORM\Column(type: 'string', length: 30, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $phone = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $email = null;

    #[ORM\Column(name: 'photo_url', type: 'text', nullable: true)]
    #[Groups(['public:read'])]
    private ?string $photoUrl = null;

    #[ORM\Column(type: 'json', options: ['default' => '[]'])]
    #[Groups(['public:read'])]
    private array $photos = [];

    #[ORM\Column(type: 'decimal', precision: 10, scale: 7, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $latitude = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 7, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $longitude = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $timezone = null;

    #[ORM\Column(name: 'show_on_website', type: 'boolean', options: ['default' => true])]
    private bool $showOnWebsite = true;

    #[ORM\Column(name: 'is_active', type: 'boolean')]
    private bool $isActive = true;

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
    public function getName(): string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $a): static { $this->address = $a; return $this; }
    public function getCity(): ?string { return $this->city; }
    public function setCity(?string $c): static { $this->city = $c; return $this; }
    public function getZipCode(): ?string { return $this->zipCode; }
    public function setZipCode(?string $z): static { $this->zipCode = $z; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $p): static { $this->phone = $p; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $e): static { $this->email = $e; return $this; }
    public function getPhotoUrl(): ?string { return $this->photoUrl; }
    public function setPhotoUrl(?string $photoUrl): static { $this->photoUrl = $photoUrl; return $this; }
    /** @return list<string> */
    public function getPhotos(): array
    {
        return array_values(array_filter(
            $this->photos,
            static fn (mixed $photo): bool => is_string($photo) && trim($photo) !== '',
        ));
    }

    /** @param list<string> $photos */
    public function setPhotos(array $photos): static
    {
        $this->photos = array_values(array_filter(
            $photos,
            static fn (mixed $photo): bool => is_string($photo) && trim($photo) !== '',
        ));

        return $this;
    }
    public function getLatitude(): ?string { return $this->latitude; }
    public function setLatitude(?string $lat): static { $this->latitude = $lat; return $this; }
    public function getLongitude(): ?string { return $this->longitude; }
    public function setLongitude(?string $lon): static { $this->longitude = $lon; return $this; }
    public function getTimezone(): ?string { return $this->timezone; }
    public function setTimezone(?string $tz): static { $this->timezone = $tz; return $this; }
    public function isShowOnWebsite(): bool { return $this->showOnWebsite; }
    public function setShowOnWebsite(bool $showOnWebsite): static { $this->showOnWebsite = $showOnWebsite; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): static { $this->isActive = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
