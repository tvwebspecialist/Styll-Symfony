<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Link;
use App\Repository\TenantRepository;
use App\State\PublicTenantResourceProvider;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Uid\Uuid;

#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/public/tenants/{slug}',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
        new GetCollection(
            uriTemplate: '/public/tenants/{slug}/tenant',
            uriVariables: ['slug' => new Link(fromClass: Tenant::class, identifiers: ['slug'])],
            normalizationContext: ['groups' => ['public:read']],
            provider: PublicTenantResourceProvider::class,
        ),
    ],
)]
#[ORM\Entity(repositoryClass: TenantRepository::class)]
#[ORM\Table(name: 'tenants')]
#[ORM\HasLifecycleCallbacks]
class Tenant
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[Groups(['public:read'])]
    private Uuid $id;

    #[ORM\Column(name: 'business_name', type: 'string', length: 255)]
    #[Groups(['public:read'])]
    private string $businessName;

    #[ORM\Column(type: 'string', length: 100, unique: true)]
    #[Groups(['public:read'])]
    private string $slug;

    #[ORM\Column(type: 'string', length: 50)]
    #[Groups(['public:read'])]
    private string $timezone = 'Europe/Rome';

    #[ORM\Column(name: 'logo_url', type: 'string', length: 500, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $logoUrl = null;

    #[ORM\Column(name: 'primary_color', type: 'string', length: 20, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $primaryColor = '#1A1A2E';

    #[ORM\Column(name: 'secondary_color', type: 'string', length: 20, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $secondaryColor = '#E94560';

    #[ORM\Column(name: 'font_family', type: 'string', length: 50, nullable: true)]
    #[Groups(['public:read'])]
    private ?string $fontFamily = 'Inter';

    #[ORM\Column(type: 'json')]
    private array $settings = [];

    #[ORM\Column(name: 'feature_flag_overrides', type: 'json')]
    private array $featureFlagOverrides = [];

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = 'active';

    #[ORM\Column(name: 'data_region', type: 'string', length: 50)]
    private string $dataRegion = 'eu-west-1';

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
    public function getBusinessName(): string { return $this->businessName; }
    public function setBusinessName(string $name): static { $this->businessName = $name; return $this; }
    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $slug): static { $this->slug = $slug; return $this; }
    public function getTimezone(): string { return $this->timezone; }
    public function setTimezone(string $tz): static { $this->timezone = $tz; return $this; }
    public function getLogoUrl(): ?string { return $this->logoUrl; }
    public function setLogoUrl(?string $url): static { $this->logoUrl = $url; return $this; }
    public function getPrimaryColor(): ?string { return $this->primaryColor; }
    public function setPrimaryColor(?string $c): static { $this->primaryColor = $c; return $this; }
    public function getSecondaryColor(): ?string { return $this->secondaryColor; }
    public function setSecondaryColor(?string $c): static { $this->secondaryColor = $c; return $this; }
    public function getFontFamily(): ?string { return $this->fontFamily; }
    public function setFontFamily(?string $f): static { $this->fontFamily = $f; return $this; }
    public function getSettings(): array { return $this->settings; }
    public function setSettings(array $s): static { $this->settings = $s; return $this; }
    public function getFeatureFlagOverrides(): array { return $this->featureFlagOverrides; }
    public function setFeatureFlagOverrides(array $f): static { $this->featureFlagOverrides = $f; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): static { $this->status = $s; return $this; }
    public function getDataRegion(): string { return $this->dataRegion; }
    public function setDataRegion(string $r): static { $this->dataRegion = $r; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    #[Groups(['public:read'])]
    #[SerializedName('tagline')]
    public function getPublicTagline(): ?string
    {
        return $this->readSettingString(['tagline']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('description')]
    public function getPublicDescription(): ?string
    {
        return $this->readSettingString(['bio']) ?? $this->readSettingString(['description']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('heroImageUrl')]
    public function getPublicHeroImageUrl(): ?string
    {
        return $this->readSettingString(['hero_image_url']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('aboutTitle')]
    public function getPublicAboutTitle(): ?string
    {
        return $this->readSettingString(['about', 'title']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('aboutText')]
    public function getPublicAboutText(): ?string
    {
        return $this->readSettingString(['about', 'text']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('aboutImageUrl')]
    public function getPublicAboutImageUrl(): ?string
    {
        return $this->readSettingString(['about', 'image_url']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('googleRating')]
    public function getPublicGoogleRating(): ?float
    {
        $value = $this->readSettingNumber(['google_rating']);
        return $value === null ? null : (float) $value;
    }

    #[Groups(['public:read'])]
    #[SerializedName('googleReviewsCount')]
    public function getPublicGoogleReviewsCount(): ?int
    {
        $value = $this->readSettingNumber(['google_reviews_count']);
        return $value === null ? null : (int) $value;
    }

    #[Groups(['public:read'])]
    #[SerializedName('teamDescription')]
    public function getPublicTeamDescription(): ?string
    {
        return $this->readSettingString(['team_description']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('locationsDescription')]
    public function getPublicLocationsDescription(): ?string
    {
        return $this->readSettingString(['locations_description']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('contactPhone')]
    public function getPublicContactPhone(): ?string
    {
        return $this->readSettingString(['contact_phone']);
    }

    #[Groups(['public:read'])]
    #[SerializedName('contactEmail')]
    public function getPublicContactEmail(): ?string
    {
        return $this->readSettingString(['contact_email']);
    }

    /**
     * @return array{instagram?: string, facebook?: string, tiktok?: string, whatsapp?: string}
     */
    #[Groups(['public:read'])]
    #[SerializedName('socialLinks')]
    public function getPublicSocialLinks(): array
    {
        $value = $this->readSettingValue(['social_links']);
        if (!is_array($value)) {
            return [];
        }

        $socialLinks = [];

        foreach (['instagram', 'facebook', 'tiktok', 'whatsapp'] as $key) {
            $candidate = $value[$key] ?? null;
            if (is_string($candidate) && trim($candidate) !== '') {
                $socialLinks[$key] = $candidate;
            }
        }

        return $socialLinks;
    }

    private function readSettingString(array $path): ?string
    {
        $value = $this->readSettingValue($path);

        return is_string($value) ? $value : null;
    }

    private function readSettingNumber(array $path): int|float|null
    {
        $value = $this->readSettingValue($path);

        return is_int($value) || is_float($value) ? $value : null;
    }

    private function readSettingValue(array $path): mixed
    {
        $cursor = $this->settings;

        foreach ($path as $segment) {
            if (!is_array($cursor) || !array_key_exists($segment, $cursor)) {
                return null;
            }

            $cursor = $cursor[$segment];
        }

        return $cursor;
    }
}
