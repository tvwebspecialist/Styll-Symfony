<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\GalleryPhoto;
use App\Entity\PortfolioPhoto;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Entity\WebsitePhoto;
use App\EventListener\TenantFilterSubscriber;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

final class MediaTenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnMediaRows(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.media@example.test');

        self::assertSame(['https://cdn.example.test/tenant-a-gallery.jpg'], $this->galleryPhotoUrls());
        self::assertSame(['https://cdn.example.test/tenant-a-website.jpg'], $this->websitePhotoUrls());
        self::assertSame(['https://cdn.example.test/tenant-a-portfolio.jpg'], $this->portfolioPhotoUrls());
    }

    public function testTenantBSeesOnlyOwnMediaRows(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.media@example.test');

        self::assertSame(['https://cdn.example.test/tenant-b-gallery.jpg'], $this->galleryPhotoUrls());
        self::assertSame(['https://cdn.example.test/tenant-b-website.jpg'], $this->websitePhotoUrls());
        self::assertSame(['https://cdn.example.test/tenant-b-portfolio.jpg'], $this->portfolioPhotoUrls());
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
            Request::create('/api/test-media-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function galleryPhotoUrls(): array
    {
        $photos = $this->em->getRepository(GalleryPhoto::class)->findBy([], ['photoUrl' => 'ASC']);

        return array_map(static fn (GalleryPhoto $photo): string => $photo->getPhotoUrl(), $photos);
    }

    /**
     * @return list<string>
     */
    private function websitePhotoUrls(): array
    {
        $photos = $this->em->getRepository(WebsitePhoto::class)->findBy([], ['url' => 'ASC']);

        return array_map(static fn (WebsitePhoto $photo): string => $photo->getUrl(), $photos);
    }

    /**
     * @return list<string>
     */
    private function portfolioPhotoUrls(): array
    {
        $photos = $this->em->getRepository(PortfolioPhoto::class)->findBy([], ['photoUrl' => 'ASC']);

        return array_map(static fn (PortfolioPhoto $photo): string => $photo->getPhotoUrl(), $photos);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-media', 'tenant-a.media@example.test', 'tenant-a');
        $this->seedTenant('Tenant B', 'tenant-b-media', 'tenant-b.media@example.test', 'tenant-b');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $urlPrefix): void
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-4-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $galleryPhoto = (new GalleryPhoto())
            ->setTenant($tenant)
            ->setPhotoUrl('https://cdn.example.test/'.$urlPrefix.'-gallery.jpg')
            ->setCaption($label.' gallery');

        $websitePhoto = (new WebsitePhoto())
            ->setTenant($tenant)
            ->setUrl('https://cdn.example.test/'.$urlPrefix.'-website.jpg')
            ->setSortOrder(0);

        $portfolioPhoto = (new PortfolioPhoto())
            ->setTenant($tenant)
            ->setStaff($staff)
            ->setPhotoUrl('https://cdn.example.test/'.$urlPrefix.'-portfolio.jpg')
            ->setServiceTags('{taglio,barba}');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($galleryPhoto);
        $this->em->persist($websitePhoto);
        $this->em->persist($portfolioPhoto);
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE gallery_photos, website_photos, portfolio_photos, users, tenants RESTART IDENTITY CASCADE',
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
