<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SiteAnalyticsDailyRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SiteAnalyticsDailyRepository::class)]
#[ORM\Table(name: 'site_analytics_daily')]
#[ORM\Index(name: 'idx_site_analytics_daily_surface', columns: ['tenant_id', 'app_surface', 'date'])]
#[ORM\HasLifecycleCallbacks]
class SiteAnalyticsDaily
{
    public const SURFACE_WEBSITE = 'website';
    public const SURFACE_PWA = 'pwa';

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Tenant::class)]
    #[ORM\JoinColumn(name: 'tenant_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Tenant $tenant;

    #[ORM\Id]
    #[ORM\Column(name: 'date', type: 'date_immutable')]
    private \DateTimeImmutable $date;

    #[ORM\Id]
    #[ORM\Column(name: 'app_surface', type: 'string', length: 16)]
    private string $appSurface = self::SURFACE_WEBSITE;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $uniqueVisitors = 0;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $sessions = 0;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $pageViews = 0;

    #[ORM\Column(name: 'booking_started_count', type: 'integer', options: ['default' => 0])]
    private int $bookingStartedCount = 0;

    #[ORM\Column(name: 'booking_completed_count', type: 'integer', options: ['default' => 0])]
    private int $bookingCompletedCount = 0;

    #[ORM\Column(name: 'signup_count', type: 'integer', options: ['default' => 0])]
    private int $signupCount = 0;

    #[ORM\Column(name: 'conversion_rate', type: 'decimal', precision: 5, scale: 4, options: ['default' => '0'])]
    private string $conversionRate = '0';

    #[ORM\Column(name: 'top_referrers', type: 'json')]
    private array $topReferrers = [];

    #[ORM\Column(name: 'device_breakdown', type: 'json')]
    private array $deviceBreakdown = [];

    #[ORM\Column(name: 'created_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetimetz_immutable', options: ['default' => 'now()'])]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $today = new \DateTimeImmutable('today');
        $this->date = $today;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getTenant(): Tenant { return $this->tenant; }
    public function setTenant(Tenant $tenant): static { $this->tenant = $tenant; return $this; }
    public function getDate(): \DateTimeImmutable { return $this->date; }
    public function setDate(\DateTimeImmutable $date): static { $this->date = $date; return $this; }
    public function getAppSurface(): string { return $this->appSurface; }
    public function setAppSurface(string $appSurface): static { $this->appSurface = $appSurface; return $this; }
    public function getUniqueVisitors(): int { return $this->uniqueVisitors; }
    public function setUniqueVisitors(int $uniqueVisitors): static { $this->uniqueVisitors = $uniqueVisitors; return $this; }
    public function getSessions(): int { return $this->sessions; }
    public function setSessions(int $sessions): static { $this->sessions = $sessions; return $this; }
    public function getPageViews(): int { return $this->pageViews; }
    public function setPageViews(int $pageViews): static { $this->pageViews = $pageViews; return $this; }
    public function getBookingStartedCount(): int { return $this->bookingStartedCount; }
    public function setBookingStartedCount(int $bookingStartedCount): static { $this->bookingStartedCount = $bookingStartedCount; return $this; }
    public function getBookingCompletedCount(): int { return $this->bookingCompletedCount; }
    public function setBookingCompletedCount(int $bookingCompletedCount): static { $this->bookingCompletedCount = $bookingCompletedCount; return $this; }
    public function getSignupCount(): int { return $this->signupCount; }
    public function setSignupCount(int $signupCount): static { $this->signupCount = $signupCount; return $this; }
    public function getConversionRate(): string { return $this->conversionRate; }
    public function setConversionRate(string $conversionRate): static { $this->conversionRate = $conversionRate; return $this; }
    public function getTopReferrers(): array { return $this->topReferrers; }
    public function setTopReferrers(array $topReferrers): static { $this->topReferrers = $topReferrers; return $this; }
    public function getDeviceBreakdown(): array { return $this->deviceBreakdown; }
    public function setDeviceBreakdown(array $deviceBreakdown): static { $this->deviceBreakdown = $deviceBreakdown; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
}
