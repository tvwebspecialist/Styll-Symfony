<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\ClientImportJob;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\TeamInvitation;
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

final class ImportAuthTenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnImportJobsAndTeamInvitations(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.imports@example.test');

        self::assertSame(['tenant-a-import.csv'], $this->importJobFilenames());
        self::assertSame(['invite-a@example.test'], $this->teamInvitationEmails());
    }

    public function testTenantBSeesOnlyOwnImportJobsAndTeamInvitations(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.imports@example.test');

        self::assertSame(['tenant-b-import.csv'], $this->importJobFilenames());
        self::assertSame(['invite-b@example.test'], $this->teamInvitationEmails());
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
            Request::create('/api/test-import-auth-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function importJobFilenames(): array
    {
        $jobs = $this->em->getRepository(ClientImportJob::class)->findBy([], ['filename' => 'ASC']);

        return array_map(static fn (ClientImportJob $job): string => (string) $job->getFilename(), $jobs);
    }

    /**
     * @return list<string>
     */
    private function teamInvitationEmails(): array
    {
        $invitations = $this->em->getRepository(TeamInvitation::class)->findBy([], ['email' => 'ASC']);

        return array_map(static fn (TeamInvitation $invitation): string => $invitation->getEmail(), $invitations);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-imports', 'tenant-a.imports@example.test', 'tenant-a-import.csv', 'invite-a@example.test');
        $this->seedTenant('Tenant B', 'tenant-b-imports', 'tenant-b.imports@example.test', 'tenant-b-import.csv', 'invite-b@example.test');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $filename, string $inviteEmail): void
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

        $job = (new ClientImportJob())
            ->setTenant($tenant)
            ->setInitiatedBy($profile)
            ->setSource(ClientImportJob::SOURCE_FRESHA)
            ->setFilename($filename)
            ->setTotalRows(10)
            ->setImportedCount(8)
            ->setSkippedCount(1)
            ->setErrorCount(1)
            ->setMergedCount(0)
            ->setStatus(ClientImportJob::STATUS_PARTIAL);

        $invitation = (new TeamInvitation())
            ->setTenant($tenant)
            ->setCreatedBy($profile)
            ->setEmail($inviteEmail)
            ->setToken(bin2hex(random_bytes(16)))
            ->setRole(TeamInvitation::ROLE_STAFF)
            ->setStatus(TeamInvitation::STATUS_PENDING);

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($job);
        $this->em->persist($invitation);
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
