<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Entity\Appointment;
use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Entity\GalleryPhoto;
use App\Entity\Location;
use App\Entity\LoyaltyConfig;
use App\Entity\LoyaltyTransaction;
use App\Entity\PortfolioPhoto;
use App\Entity\Product;
use App\Entity\ProductInventory;
use App\Entity\Profile;
use App\Entity\Promotion;
use App\Entity\PromotionProduct;
use App\Entity\PromotionService;
use App\Entity\Reward;
use App\Entity\RewardRedemption;
use App\Entity\Service;
use App\Entity\ServiceCategory;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Entity\WebsitePhoto;
use App\Entity\WorkingHour;
use App\Entity\WorkingHourOverride;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Cache\CacheItemPoolInterface;
use RuntimeException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class TestTenantFixture
{
    public const PASSWORD = 'styll-test-password-only';
    public const TENANT_A_EMAIL = 'tenant-a.api@example.test';
    public const TENANT_B_EMAIL = 'tenant-b.api@example.test';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly CacheItemPoolInterface $rateLimiterCache,
    ) {}

    /**
     * @return array{tenantA: Tenant, tenantB: Tenant, userA: User, userB: User}
     */
    public function seedTwoTenantsWithClients(): array
    {
        $tenantA = $this->seedTenant(
            businessName: 'Tenant A API Barber',
            slug: 'tenant-a-api',
            staffEmail: self::TENANT_A_EMAIL,
            staffName: 'Tenant A API Staff',
            clientPrefix: 'Tenant A API',
            phonePrefix: '+391001',
        );

        $tenantB = $this->seedTenant(
            businessName: 'Tenant B API Barber',
            slug: 'tenant-b-api',
            staffEmail: self::TENANT_B_EMAIL,
            staffName: 'Tenant B API Staff',
            clientPrefix: 'Tenant B API',
            phonePrefix: '+391002',
        );

        $this->em->flush();

        return [
            'tenantA' => $tenantA['tenant'],
            'tenantB' => $tenantB['tenant'],
            'userA' => $tenantA['user'],
            'userB' => $tenantB['user'],
        ];
    }

    /**
     * @return array{tenantA: Tenant, tenantB: Tenant}
     */
    public function seedTwoTenantsWithPublicLandingData(): array
    {
        $seeded = $this->seedTwoTenantsWithClients();

        $this->seedPublicLandingData($seeded['tenantA'], 'Tenant A Public', self::TENANT_A_EMAIL);
        $this->seedPublicLandingData($seeded['tenantB'], 'Tenant B Public', self::TENANT_B_EMAIL);

        $this->em->flush();

        return [
            'tenantA' => $seeded['tenantA'],
            'tenantB' => $seeded['tenantB'],
        ];
    }

    /**
     * @return array{tenantA: Tenant, tenantB: Tenant, user: User}
     */
    public function seedMultiTenantStaffUser(): array
    {
        $seeded = $this->seedTwoTenantsWithClients();
        $this->addStaffMembership($seeded['userA'], $seeded['tenantB'], 'manager');
        $this->em->flush();

        return [
            'tenantA' => $seeded['tenantA'],
            'tenantB' => $seeded['tenantB'],
            'user' => $seeded['userA'],
        ];
    }

    public function resetDatabase(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }

        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
        $this->em->clear();
        $this->rateLimiterCache->clear();
    }

    /**
     * @return array{tenant: Tenant, user: User}
     */
    private function seedTenant(
        string $businessName,
        string $slug,
        string $staffEmail,
        string $staffName,
        string $clientPrefix,
        string $phonePrefix,
    ): array {
        $tenant = (new Tenant())
            ->setBusinessName($businessName)
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setRoles(['ROLE_STAFF']);
        $user->setPassword($this->passwordHasher->hashPassword($user, self::PASSWORD));

        $profile = (new Profile($user))
            ->setFullName($staffName);

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner')
            ->setShowOnWebsite(false);

        $clientOne = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 1')
            ->setPhone($phonePrefix.'1');

        $clientTwo = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 2')
            ->setPhone($phonePrefix.'2');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($clientOne);
        $this->em->persist($clientTwo);

        return ['tenant' => $tenant, 'user' => $user];
    }

    public function addStaffMembership(User $user, Tenant $tenant, string $role = 'manager'): StaffMember
    {
        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        if (!$profile instanceof Profile) {
            throw new RuntimeException(sprintf('Profile for user "%s" was not found in test fixture.', $user->getEmail()));
        }

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole($role)
            ->setShowOnWebsite(false);

        $this->em->persist($staff);

        return $staff;
    }

    private function seedPublicLandingData(Tenant $tenant, string $prefix, string $staffEmail): void
    {
        $slug = strtolower(str_replace(' ', '-', $prefix));

        $tenant->setSettings([
            'tagline' => $prefix.' Tagline',
            'bio' => $prefix.' Hero Description',
            'hero_image_url' => 'https://cdn.example.test/'.$slug.'/hero.jpg',
            'about' => [
                'title' => $prefix.' About Title',
                'text' => $prefix.' About Text',
                'image_url' => 'https://cdn.example.test/'.$slug.'/about.jpg',
            ],
            'google_rating' => 4.8,
            'google_reviews_count' => 143,
            'team_description' => $prefix.' Team Description',
            'locations_description' => $prefix.' Locations Description',
            'contact_phone' => '+3902000000',
            'contact_email' => $slug.'@example.test',
            'social_links' => [
                'instagram' => 'https://instagram.com/'.$slug,
                'facebook' => 'https://facebook.com/'.$slug,
                'tiktok' => 'https://tiktok.com/@'.$slug,
                'whatsapp' => '+39 333 000 0000',
            ],
        ]);

        $location = (new Location())
            ->setTenant($tenant)
            ->setName($prefix.' Location')
            ->setAddress($prefix.' Address')
            ->setCity('Milano')
            ->setZipCode('20100')
            ->setPhone('+3902000000')
            ->setEmail($slug.'@example.test')
            ->setPhotoUrl('https://cdn.example.test/'.$slug.'/location-cover.jpg')
            ->setPhotos([
                'https://cdn.example.test/'.$slug.'/location-1.jpg',
                'https://cdn.example.test/'.$slug.'/location-2.jpg',
            ])
            ->setLatitude('45.4642000')
            ->setLongitude('9.1900000')
            ->setTimezone('Europe/Rome');

        $hiddenLocation = (new Location())
            ->setTenant($tenant)
            ->setName($prefix.' Hidden Location')
            ->setAddress('Hidden address')
            ->setShowOnWebsite(false);

        $category = (new ServiceCategory())
            ->setTenant($tenant)
            ->setName($prefix.' Category')
            ->setDisplayOrder(1);

        $service = (new Service())
            ->setTenant($tenant)
            ->setServiceCategory($category)
            ->setName($prefix.' Service')
            ->setDescription($prefix.' Service Description')
            ->setPrice('25.00')
            ->setDurationMinutes(30)
            ->setCategory('Hair')
            ->setDisplayOrder(1);

        $hiddenService = (new Service())
            ->setTenant($tenant)
            ->setName($prefix.' Hidden Service')
            ->setPrice('40.00')
            ->setDurationMinutes(45)
            ->setDisplayOrder(99)
            ->setShowOnWebsite(false);

        $product = (new Product())
            ->setTenant($tenant)
            ->setName($prefix.' Product')
            ->setBrand($prefix.' Brand')
            ->setDescription($prefix.' Product Description')
            ->setPriceSell('19.90')
            ->setPriceCost('4.00')
            ->setSku($prefix.'-PRIVATE-SKU')
            ->setPhotoUrl('https://cdn.example.test/'.$slug.'/product.jpg')
            ->setCategory('Care')
            ->setDisplayOrder(1)
            ->setIsNew(true);

        $hiddenProduct = (new Product())
            ->setTenant($tenant)
            ->setName($prefix.' Hidden Product')
            ->setPriceSell('29.90')
            ->setDisplayOrder(99)
            ->setShowOnSite(false);

        $staffUser = (new User())
            ->setEmail('public-'.$staffEmail)
            ->setRoles(['ROLE_STAFF']);
        $staffUser->setPassword($this->passwordHasher->hashPassword($staffUser, self::PASSWORD));

        $staffProfile = (new Profile($staffUser))
            ->setFullName($prefix.' Barber')
            ->setPhone('+3999999999')
            ->setBio($prefix.' Private Profile Bio');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($staffProfile)
            ->setRole('manager')
            ->setBio($prefix.' Public Bio')
            ->setPhotoUrl('https://cdn.example.test/'.$slug.'/staff.jpg')
            ->setNotificationPreferences(['private' => true]);

        $hiddenStaffUser = (new User())
            ->setEmail('hidden-'.$staffEmail)
            ->setRoles(['ROLE_STAFF']);
        $hiddenStaffUser->setPassword($this->passwordHasher->hashPassword($hiddenStaffUser, self::PASSWORD));

        $hiddenStaffProfile = (new Profile($hiddenStaffUser))
            ->setFullName($prefix.' Hidden Barber');

        $hiddenStaff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($hiddenStaffProfile)
            ->setRole('staff')
            ->setShowOnWebsite(false);

        $galleryPhoto = (new GalleryPhoto())
            ->setTenant($tenant)
            ->setPhotoUrl('https://cdn.example.test/'.$slug.'/gallery.jpg')
            ->setCaption($prefix.' Gallery')
            ->setDisplayOrder(1);

        $portfolioPhoto = (new PortfolioPhoto())
            ->setTenant($tenant)
            ->setStaff($staff)
            ->setPhotoUrl('https://cdn.example.test/'.$slug.'/portfolio.jpg')
            ->setServiceTags('{cut}')
            ->setDisplayOrder(1);

        $websitePhoto = (new WebsitePhoto())
            ->setTenant($tenant)
            ->setUrl('https://cdn.example.test/'.$slug.'/website.jpg')
            ->setSortOrder(1);

        $promotion = (new Promotion())
            ->setTenant($tenant)
            ->setTitle($prefix.' Promotion')
            ->setDescription($prefix.' Promotion Description')
            ->setDiscountType(Promotion::DISCOUNT_PERCENT)
            ->setDiscountValue('10.00')
            ->setShowOnLanding(true)
            ->setIsActive(true)
            ->setDisplayOrder(1);

        $promotionService = (new PromotionService())
            ->setTenant($tenant)
            ->setPromotion($promotion)
            ->setService($service)
            ->setDiscountType(PromotionService::DISCOUNT_PERCENT)
            ->setDiscountValue('10.00');

        $promotionProduct = (new PromotionProduct())
            ->setTenant($tenant)
            ->setPromotion($promotion)
            ->setProduct($product)
            ->setDiscountType(PromotionProduct::DISCOUNT_FIXED)
            ->setDiscountValue('5.00');

        $productInventory = (new ProductInventory())
            ->setTenant($tenant)
            ->setProduct($product)
            ->setLocation($location)
            ->setQuantity(6)
            ->setLowStockThreshold(2);

        foreach ([
            $location,
            $hiddenLocation,
            $category,
            $service,
            $hiddenService,
            $product,
            $hiddenProduct,
            $productInventory,
            $staffUser,
            $staffProfile,
            $staff,
            $hiddenStaffUser,
            $hiddenStaffProfile,
            $hiddenStaff,
            $galleryPhoto,
            $portfolioPhoto,
            $websitePhoto,
            $promotion,
            $promotionService,
            $promotionProduct,
        ] as $entity) {
            $this->em->persist($entity);
        }
    }

    /**
     * Seeds two tenants for Fase 2a appointment write tests.
     *
     * Builds on seedTwoTenantsWithCalendarData() and adds clientBCross to the returned array
     * so cross-tenant create/update/delete tests can reference a client from Tenant B.
     *
     * @return array{
     *   tenantA: Tenant, tenantB: Tenant,
     *   staffA: StaffMember, staffB: StaffMember,
     *   locationA: Location, serviceA: Service,
     *   clientA: Client, clientBCross: Client,
     *   appointmentA: Appointment, appointmentB: Appointment,
     * }
     */
    public function seedTwoTenantsWithBookingData(): array
    {
        $base = $this->seedTwoTenantsWithCalendarData();

        // Retrieve a client from Tenant B for cross-tenant tests
        /** @var Client $clientBCross */
        $clientBCross = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.tenant = :t')
            ->setParameter('t', $base['tenantB'])
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        return [
            'tenantA'      => $base['tenantA'],
            'tenantB'      => $base['tenantB'],
            'staffA'       => $base['staffA'],
            'staffB'       => $base['staffB'],
            'locationA'    => $base['locationA'],
            'serviceA'     => $base['serviceA'],
            'clientA'      => $base['clientA'],
            'clientBCross' => $clientBCross,
            'appointmentA' => $base['appointmentA'],
            'appointmentB' => $base['appointmentB'],
        ];
    }

    /**
     * Seeds two tenants with calendar data for Fase 1b tests.
     *
     * Returns data needed for appointment and availability tests:
     * - tenantA, tenantB
     * - staffA, staffB (StaffMember with UUID accessible via getId())
     * - locationA
     * - serviceA (30 min duration)
     * - clientA
     * - appointmentA: 2030-01-14T09:00:00Z to 10:00:00Z UTC (= 10:00-11:00 Europe/Rome, Monday, status confirmed)
     * - working hours for staffA on Monday (day_of_week=1): 09:00-18:00
     * - override for staffA on 2030-01-07 (Monday): is_closed=true
     * - appointmentB: 2030-01-14T09:00:00Z UTC — belongs to tenantB (for cross-tenant isolation tests)
     *
     * Test date 2030-01-07 = Monday (day_of_week=1, is_closed override)
     * Test date 2030-01-14 = Monday (day_of_week=1, normal working hours, appointment at 10:00)
     *
     * @return array{
     *   tenantA: Tenant, tenantB: Tenant,
     *   staffA: StaffMember, staffB: StaffMember,
     *   locationA: Location, serviceA: Service, clientA: Client,
     *   appointmentA: Appointment, appointmentB: Appointment,
     * }
     */
    public function seedTwoTenantsWithCalendarData(): array
    {
        $base = $this->seedTwoTenantsWithClients();
        /** @var Tenant $tenantA */
        $tenantA = $base['tenantA'];
        /** @var Tenant $tenantB */
        $tenantB = $base['tenantB'];

        // Retrieve staff members created in seedTwoTenantsWithClients
        $staffA = $this->em->createQueryBuilder()
            ->select('s')
            ->from(StaffMember::class, 's')
            ->where('s.tenant = :t')
            ->setParameter('t', $tenantA)
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        $staffB = $this->em->createQueryBuilder()
            ->select('s')
            ->from(StaffMember::class, 's')
            ->where('s.tenant = :t')
            ->setParameter('t', $tenantB)
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        // Location for Tenant A
        $locationA = (new Location())
            ->setTenant($tenantA)
            ->setName('Calendar Test Location A')
            ->setAddress('Via Roma 1')
            ->setCity('Milano')
            ->setZipCode('20100');

        // Location for Tenant B
        $locationB = (new Location())
            ->setTenant($tenantB)
            ->setName('Calendar Test Location B')
            ->setAddress('Via Roma 2')
            ->setCity('Roma')
            ->setZipCode('00100');

        // Service for Tenant A (30 min)
        $serviceA = (new Service())
            ->setTenant($tenantA)
            ->setName('Calendar Test Service A')
            ->setPrice('25.00')
            ->setDurationMinutes(30);

        // Service for Tenant B
        $serviceB = (new Service())
            ->setTenant($tenantB)
            ->setName('Calendar Test Service B')
            ->setPrice('20.00')
            ->setDurationMinutes(30);

        // Retrieve clients created in seedTwoTenantsWithClients
        $clientA = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.tenant = :t')
            ->setParameter('t', $tenantA)
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        $clientB = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.tenant = :t')
            ->setParameter('t', $tenantB)
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        // Working hours for staffA: Monday (day_of_week=1) 09:00-18:00
        $workingHour = (new WorkingHour())
            ->setTenant($tenantA)
            ->setStaff($staffA)
            ->setDayOfWeek(1)
            ->setStartTime(new \DateTimeImmutable('1970-01-01 09:00:00'))
            ->setEndTime(new \DateTimeImmutable('1970-01-01 18:00:00'));

        // Override for staffA on 2030-01-07 (Monday): closed
        $closedOverride = (new WorkingHourOverride())
            ->setTenant($tenantA)
            ->setStaff($staffA)
            ->setDate(new \DateTimeImmutable('2030-01-07'))
            ->setIsClosed(true)
            ->setReason('Test chiusura');

        // Appointment for Tenant A on 2030-01-14 (Monday) 09:00-10:00 UTC = 10:00-11:00 Europe/Rome (UTC+1 in January)
        $appointmentA = (new Appointment())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setStaff($staffA)
            ->setLocation($locationA)
            ->setStartTime(new \DateTimeImmutable('2030-01-14T09:00:00+00:00'))
            ->setEndTime(new \DateTimeImmutable('2030-01-14T10:00:00+00:00'))
            ->setStatus(Appointment::STATUS_CONFIRMED)
            ->setBookingSource(Appointment::SOURCE_DASHBOARD_OWNER);

        // Appointment for Tenant B on same date (for cross-tenant isolation test)
        $appointmentB = (new Appointment())
            ->setTenant($tenantB)
            ->setClient($clientB)
            ->setStaff($staffB)
            ->setLocation($locationB)
            ->setStartTime(new \DateTimeImmutable('2030-01-14T09:00:00+00:00'))
            ->setEndTime(new \DateTimeImmutable('2030-01-14T10:00:00+00:00'))
            ->setStatus(Appointment::STATUS_CONFIRMED)
            ->setBookingSource(Appointment::SOURCE_DASHBOARD_OWNER);

        foreach ([$locationA, $locationB, $serviceA, $serviceB, $workingHour, $closedOverride, $appointmentA, $appointmentB] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        return [
            'tenantA'       => $tenantA,
            'tenantB'       => $tenantB,
            'staffA'        => $staffA,
            'staffB'        => $staffB,
            'locationA'     => $locationA,
            'serviceA'      => $serviceA,
            'clientA'       => $clientA,
            'appointmentA'  => $appointmentA,
            'appointmentB'  => $appointmentB,
        ];
    }

    /**
     * Seeds two tenants for Fase 2b Loyalty WRITE tests.
     *
     * Builds on seedTwoTenantsWithBookingData() and adds:
     *   - loyaltyConfigA: active, classic template, 100 pts/visit
     *   - rewardA1: 50 pts cost (cheap — usable immediately after 1 visit)
     *   - rewardA2: 1000 pts cost (expensive — for "insufficient" tests)
     *
     * clientA starts with NO ClientLoyalty (created by listener on first completion).
     * appointmentA is status=confirmed, owned by clientA+staffA — ready to be completed.
     *
     * @return array{
     *   tenantA: Tenant, tenantB: Tenant,
     *   staffA: StaffMember, staffB: StaffMember,
     *   locationA: Location, serviceA: Service,
     *   clientA: Client, clientBCross: Client,
     *   appointmentA: Appointment, appointmentB: Appointment,
     *   loyaltyConfigA: LoyaltyConfig,
     *   rewardA1: Reward, rewardA2: Reward,
     * }
     */
    public function seedTwoTenantsWithLoyaltyWriteData(): array
    {
        $base = $this->seedTwoTenantsWithBookingData();

        $loyaltyConfigA = (new LoyaltyConfig())
            ->setTenant($base['tenantA'])
            ->setTemplate(LoyaltyConfig::TEMPLATE_CLASSIC)
            ->setIsActive(true)
            ->setPointsPerVisit(100)
            ->setStreakThresholdDays(45)
            ->setVersion(1);

        $rewardA1 = (new Reward())
            ->setTenant($base['tenantA'])
            ->setName('Prodotto gratis')
            ->setPointsCost(50)
            ->setRewardType(Reward::TYPE_PRODUCT)
            ->setIsActive(true)
            ->setDisplayOrder(1);

        $rewardA2 = (new Reward())
            ->setTenant($base['tenantA'])
            ->setName('Sconto VIP')
            ->setPointsCost(1000)
            ->setRewardType(Reward::TYPE_DISCOUNT)
            ->setIsActive(true)
            ->setDisplayOrder(2);

        $this->em->persist($loyaltyConfigA);
        $this->em->persist($rewardA1);
        $this->em->persist($rewardA2);
        $this->em->flush();

        return [
            ...$base,
            'loyaltyConfigA' => $loyaltyConfigA,
            'rewardA1'       => $rewardA1,
            'rewardA2'       => $rewardA2,
        ];
    }

    /**
     * Seeds two tenants for Fase 1c Loyalty read-only tests.
     *
     * Tenant A — full loyalty setup:
     *   - LoyaltyConfig (active, classic template, ended_at=null)
     *   - Reward A1 (500 pts) and Reward A2 (1000 pts), both active
     *   - clientA: enrolled — ClientLoyalty with 200 total / 150 available / streak 3
     *   - LoyaltyTransaction earn +200 pts for clientA
     *   - RewardRedemption 50 pts for clientA using Reward A1
     *   - clientAUnenrolled: second client of tenantA with NO ClientLoyalty record
     *
     * Tenant B — no loyalty data (no config, no rewards) — used to verify:
     *   - GET /api/loyalty-config → 404 for tenant B
     *   - GET /api/rewards → [] for tenant B
     *   - cross-tenant client isolation (clientBCross UUID unknown to tenant A)
     *
     * @return array{
     *   tenantA: Tenant, tenantB: Tenant,
     *   clientA: Client, clientAUnenrolled: Client, clientBCross: Client,
     *   loyaltyConfigA: LoyaltyConfig,
     *   rewardA1: Reward, rewardA2: Reward,
     *   clientLoyaltyA: ClientLoyalty,
     *   transactionA: LoyaltyTransaction,
     *   redemptionA: RewardRedemption,
     * }
     */
    public function seedTwoTenantsWithLoyaltyData(): array
    {
        $base = $this->seedTwoTenantsWithClients();
        /** @var Tenant $tenantA */
        $tenantA = $base['tenantA'];
        /** @var Tenant $tenantB */
        $tenantB = $base['tenantB'];

        // Retrieve clients: two per tenant created by seedTwoTenantsWithClients
        $clientsA = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.tenant = :t')
            ->setParameter('t', $tenantA)
            ->orderBy('c.createdAt', 'ASC')
            ->getQuery()
            ->getResult();

        /** @var Client $clientA */
        $clientA = $clientsA[0];
        /** @var Client $clientAUnenrolled */
        $clientAUnenrolled = $clientsA[1];

        /** @var Client $clientBCross */
        $clientBCross = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.tenant = :t')
            ->setParameter('t', $tenantB)
            ->setMaxResults(1)
            ->getQuery()
            ->getSingleResult();

        // Tenant A: active loyalty config (classic, 100 pts/visit)
        $loyaltyConfigA = (new LoyaltyConfig())
            ->setTenant($tenantA)
            ->setTemplate(LoyaltyConfig::TEMPLATE_CLASSIC)
            ->setIsActive(true)
            ->setPointsPerVisit(100)
            ->setStreakThresholdDays(45)
            ->setVersion(1);

        // Tenant A: two active rewards (Tenant B gets none)
        $rewardA1 = (new Reward())
            ->setTenant($tenantA)
            ->setName('Prodotto gratis')
            ->setDescription('Un prodotto a scelta in regalo.')
            ->setPointsCost(500)
            ->setRewardType(Reward::TYPE_PRODUCT)
            ->setDisplayOrder(1)
            ->setIsActive(true);

        $rewardA2 = (new Reward())
            ->setTenant($tenantA)
            ->setName('Sconto 10%')
            ->setDescription('10% di sconto sulla prossima visita.')
            ->setPointsCost(1000)
            ->setRewardType(Reward::TYPE_DISCOUNT)
            ->setDisplayOrder(2)
            ->setIsActive(true);

        // Tenant A: clientA is enrolled — 200 total, 150 available (50 spent on redemption)
        $clientLoyaltyA = (new ClientLoyalty())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setTotalPoints(200)
            ->setAvailablePoints(150)
            ->setCurrentStreak(3)
            ->setLongestStreak(3)
            ->setCurrentTier('bronze')
            ->setTierPointsThisYear(200)
            ->setTierYear((int) (new \DateTimeImmutable())->format('Y'));

        // Earn transaction: +200 pts
        $transactionA = (new LoyaltyTransaction())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setType(LoyaltyTransaction::TYPE_EARN)
            ->setPoints(200)
            ->setDescription('Visita completata')
            ->setLoyaltyConfigVersion(1);

        // Redemption: 50 pts spent on rewardA1 (confirmed)
        $redemptionA = (new RewardRedemption())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setReward($rewardA1)
            ->setPointsSpent(50)
            ->setConfirmedAt(new \DateTimeImmutable('2030-01-14T12:00:00+00:00'));

        foreach ([$loyaltyConfigA, $rewardA1, $rewardA2, $clientLoyaltyA, $transactionA, $redemptionA] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->flush();

        return [
            'tenantA'          => $tenantA,
            'tenantB'          => $tenantB,
            'clientA'          => $clientA,
            'clientAUnenrolled' => $clientAUnenrolled,
            'clientBCross'     => $clientBCross,
            'loyaltyConfigA'   => $loyaltyConfigA,
            'rewardA1'         => $rewardA1,
            'rewardA2'         => $rewardA2,
            'clientLoyaltyA'   => $clientLoyaltyA,
            'transactionA'     => $transactionA,
            'redemptionA'      => $redemptionA,
        ];
    }
}
