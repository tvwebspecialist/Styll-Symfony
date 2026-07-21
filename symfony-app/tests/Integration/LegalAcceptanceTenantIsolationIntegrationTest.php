<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\LegalAcceptanceEvent;
use App\Entity\LegalAcceptancePending;
use App\Entity\Profile;
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

final class LegalAcceptanceTenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnLegalAcceptanceEvents(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.legal@example.test');

        self::assertSame(['tenant-a-terms-v1'], $this->legalAcceptanceMarkers());
    }

    public function testTenantBSeesOnlyOwnLegalAcceptanceEvents(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.legal@example.test');

        self::assertSame(['tenant-b-terms-v1'], $this->legalAcceptanceMarkers());
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
            Request::create('/api/test-legal-acceptance-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function legalAcceptanceMarkers(): array
    {
        $events = $this->em->getRepository(LegalAcceptanceEvent::class)->findBy([], ['documentVersion' => 'ASC']);

        return array_map(static fn (LegalAcceptanceEvent $event): string => $event->getDocumentVersion(), $events);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-legal', 'tenant-a.legal@example.test', 'tenant-a-terms-v1', 'tenant-a-pending-token-hash');
        $this->seedTenant('Tenant B', 'tenant-b-legal', 'tenant-b.legal@example.test', 'tenant-b-terms-v1', 'tenant-b-pending-token-hash');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $documentVersion, string $tokenHash): void
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-3-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $event = (new LegalAcceptanceEvent())
            ->setUser($user)
            ->setProfile($profile)
            ->setTenant($tenant)
            ->setDocumentType(LegalAcceptanceEvent::DOCUMENT_TYPE_B2B_TERMS)
            ->setDocumentVersion($documentVersion)
            ->setPrivacyNoticeVersion('privacy-v1')
            ->setAcceptedBy($profile)
            ->setSource(LegalAcceptanceEvent::SOURCE_EMAIL_PASSWORD_REGISTER)
            ->setMetadata(['label' => $label]);

        $pending = (new LegalAcceptancePending())
            ->setTokenHash($tokenHash)
            ->setSource(LegalAcceptancePending::SOURCE_EMAIL_PASSWORD_REGISTER)
            ->setDocumentType(LegalAcceptancePending::DOCUMENT_TYPE_B2B_TERMS)
            ->setDocumentVersion($documentVersion)
            ->setPrivacyNoticeVersion('privacy-v1')
            ->setAcceptedByEmail($staffEmail)
            ->setMetadata(['label' => $label]);

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($event);
        $this->em->persist($pending);
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
