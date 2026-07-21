<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Client;
use App\Entity\ClientPrivacyRequest;
use App\Entity\MarketingUnsubscribeToken;
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

final class PrivacyConsentTenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnPrivacyRequestsAndUnsubscribeTokens(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.privacy@example.test');

        self::assertSame(['tenant-a-erasure'], $this->privacyRequestMarkers());
        self::assertSame(['tenant-a-token-hash'], $this->unsubscribeTokenHashes());
    }

    public function testTenantBSeesOnlyOwnPrivacyRequestsAndUnsubscribeTokens(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.privacy@example.test');

        self::assertSame(['tenant-b-erasure'], $this->privacyRequestMarkers());
        self::assertSame(['tenant-b-token-hash'], $this->unsubscribeTokenHashes());
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
            Request::create('/api/test-privacy-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function privacyRequestMarkers(): array
    {
        $requests = $this->em->getRepository(ClientPrivacyRequest::class)->findBy([], ['createdAt' => 'ASC']);

        return array_map(
            static fn (ClientPrivacyRequest $request): string => (string) ($request->getDetails()['marker'] ?? ''),
            $requests,
        );
    }

    /**
     * @return list<string>
     */
    private function unsubscribeTokenHashes(): array
    {
        $tokens = $this->em->getRepository(MarketingUnsubscribeToken::class)->findBy([], ['tokenHash' => 'ASC']);

        return array_map(static fn (MarketingUnsubscribeToken $token): string => $token->getTokenHash(), $tokens);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-privacy', 'tenant-a.privacy@example.test', '+393334440001', 'tenant-a-erasure', 'tenant-a-token-hash');
        $this->seedTenant('Tenant B', 'tenant-b-privacy', 'tenant-b.privacy@example.test', '+393334440002', 'tenant-b-erasure', 'tenant-b-token-hash');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $clientPhone, string $marker, string $tokenHash): void
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

        $client = (new Client())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setFullName($label.' Client')
            ->setPhone($clientPhone);

        $privacyRequest = (new ClientPrivacyRequest())
            ->setTenant($tenant)
            ->setClient($client)
            ->setProfile($profile)
            ->setAction(ClientPrivacyRequest::ACTION_ERASURE)
            ->setStatus(ClientPrivacyRequest::STATUS_SUBMITTED)
            ->setDetails(['marker' => $marker]);

        $unsubscribeToken = (new MarketingUnsubscribeToken())
            ->setTenant($tenant)
            ->setClient($client)
            ->setTokenHash($tokenHash);

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($client);
        $this->em->persist($privacyRequest);
        $this->em->persist($unsubscribeToken);
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
