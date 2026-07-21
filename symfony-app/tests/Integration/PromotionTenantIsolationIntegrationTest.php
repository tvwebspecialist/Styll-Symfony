<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Product;
use App\Entity\Profile;
use App\Entity\Promotion;
use App\Entity\PromotionProduct;
use App\Entity\PromotionService;
use App\Entity\Service;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\EventListener\TenantFilterSubscriber;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

final class PromotionTenantIsolationIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private TokenStorageInterface $tokenStorage;
    private TenantContext $tenantContext;

    protected function setUp(): void
    {
        self::bootKernel();

        $container = self::getContainer();
        $this->em = $container->get(EntityManagerInterface::class);
        $this->tokenStorage = $container->get(TokenStorageInterface::class);
        $this->tenantContext = $container->get(TenantContext::class);

        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        $this->resetDatabase();
        $this->seedTwoTenants();
        $this->em->clear();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        parent::tearDown();
    }

    public function testTenantASeesOnlyOwnPromotionsAndPromotionItems(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.promotions@example.test');

        self::assertSame(['Tenant A Promo'], $this->promotionTitles());
        self::assertSame(['Tenant A Promo'], $this->promotionServiceTitles());
        self::assertSame(['Tenant A Promo'], $this->promotionProductTitles());
    }

    public function testTenantBSeesOnlyOwnPromotionsAndPromotionItems(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.promotions@example.test');

        self::assertSame(['Tenant B Promo'], $this->promotionTitles());
        self::assertSame(['Tenant B Promo'], $this->promotionServiceTitles());
        self::assertSame(['Tenant B Promo'], $this->promotionProductTitles());
    }

    private function authenticateAndEnableFilter(string $email): void
    {
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        self::assertInstanceOf(User::class, $user);

        $this->tokenStorage->setToken(new UsernamePasswordToken($user, 'api', $user->getRoles()));
        $this->tenantContext->reset();
        $this->enableFilterForCurrentRequest();
    }

    private function enableFilterForCurrentRequest(): void
    {
        $subscriber = self::getContainer()->get(TenantFilterSubscriber::class);
        self::assertInstanceOf(TenantFilterSubscriber::class, $subscriber);

        $subscriber(new RequestEvent(
            self::$kernel,
            Request::create('/api/test-promotion-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function promotionTitles(): array
    {
        $promotions = $this->em->getRepository(Promotion::class)->findBy([], ['title' => 'ASC']);

        return array_map(static fn (Promotion $promotion): string => $promotion->getTitle(), $promotions);
    }

    /**
     * @return list<string>
     */
    private function promotionServiceTitles(): array
    {
        $promotionServices = $this->em->getRepository(PromotionService::class)->findAll();

        return array_map(
            static fn (PromotionService $promotionService): string => $promotionService->getPromotion()->getTitle(),
            $promotionServices,
        );
    }

    /**
     * @return list<string>
     */
    private function promotionProductTitles(): array
    {
        $promotionProducts = $this->em->getRepository(PromotionProduct::class)->findAll();

        return array_map(
            static fn (PromotionProduct $promotionProduct): string => $promotionProduct->getPromotion()->getTitle(),
            $promotionProducts,
        );
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-promotions', 'tenant-a.promotions@example.test');
        $this->seedTenant('Tenant B', 'tenant-b-promotions', 'tenant-b.promotions@example.test');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail): void
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-2-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $service = (new Service())
            ->setTenant($tenant)
            ->setName($label.' Service')
            ->setPrice('25.00')
            ->setDurationMinutes(30);

        $product = (new Product())
            ->setTenant($tenant)
            ->setName($label.' Product')
            ->setPriceSell('12.00');

        $promotion = (new Promotion())
            ->setTenant($tenant)
            ->setTitle($label.' Promo')
            ->setDiscountType(Promotion::DISCOUNT_PERCENT)
            ->setDiscountValue('10.00')
            ->setService($service);

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
            ->setDiscountValue('2.00');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($service);
        $this->em->persist($product);
        $this->em->persist($promotion);
        $this->em->persist($promotionService);
        $this->em->persist($promotionProduct);
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
    }

    private function disableTenantFilter(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }
    }
}
