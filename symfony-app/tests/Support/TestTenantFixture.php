<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Entity\Client;
use App\Entity\GalleryPhoto;
use App\Entity\Location;
use App\Entity\PortfolioPhoto;
use App\Entity\Product;
use App\Entity\ProductInventory;
use App\Entity\Profile;
use App\Entity\Promotion;
use App\Entity\PromotionProduct;
use App\Entity\PromotionService;
use App\Entity\Service;
use App\Entity\ServiceCategory;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Entity\WebsitePhoto;
use Doctrine\ORM\EntityManagerInterface;
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
}
