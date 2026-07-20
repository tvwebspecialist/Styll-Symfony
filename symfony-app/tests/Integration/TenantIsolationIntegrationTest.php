<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Appointment;
use App\Entity\Client;
use App\Entity\Location;
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

final class TenantIsolationIntegrationTest extends KernelTestCase
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

    public function testTenantASeesOnlyOwnClientsAndAppointments(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.integration@example.test');

        self::assertSame(['Tenant A - Client 1', 'Tenant A - Client 2'], $this->clientNames());
        self::assertSame(['Tenant A - Client 1'], $this->appointmentClientNames());
    }

    public function testTenantBSeesOnlyOwnClientsAndAppointments(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.integration@example.test');

        self::assertSame(['Tenant B - Client 1', 'Tenant B - Client 2'], $this->clientNames());
        self::assertSame(['Tenant B - Client 1'], $this->appointmentClientNames());
    }

    public function testMissingAuthenticationReturnsNoTenantRowsWithoutError(): void
    {
        $this->enableFilterForCurrentRequest();

        self::assertSame([], $this->clientNames());
        self::assertSame([], $this->appointmentClientNames());
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
            Request::create('/api/test-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function clientNames(): array
    {
        $clients = $this->em->getRepository(Client::class)->findBy([], ['fullName' => 'ASC']);

        return array_map(static fn (Client $client): string => $client->getFullName(), $clients);
    }

    /**
     * @return list<string>
     */
    private function appointmentClientNames(): array
    {
        $appointments = $this->em->getRepository(Appointment::class)->findBy([], ['startTime' => 'ASC']);

        return array_map(static fn (Appointment $appointment): string => $appointment->getClient()->getFullName(), $appointments);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant(
            businessName: 'Tenant A Barber',
            slug: 'tenant-a-integration',
            staffEmail: 'tenant-a.integration@example.test',
            staffName: 'Tenant A Staff',
            clientPrefix: 'Tenant A',
            phonePrefix: '+390100',
            appointmentStart: '2026-07-21 09:00:00 Europe/Rome',
        );

        $this->seedTenant(
            businessName: 'Tenant B Barber',
            slug: 'tenant-b-integration',
            staffEmail: 'tenant-b.integration@example.test',
            staffName: 'Tenant B Staff',
            clientPrefix: 'Tenant B',
            phonePrefix: '+390200',
            appointmentStart: '2026-07-21 11:00:00 Europe/Rome',
        );

        $this->em->flush();
    }

    private function seedTenant(
        string $businessName,
        string $slug,
        string $staffEmail,
        string $staffName,
        string $clientPrefix,
        string $phonePrefix,
        string $appointmentStart,
    ): void {
        $tenant = (new Tenant())
            ->setBusinessName($businessName)
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-1-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($staffName);

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $location = (new Location())
            ->setTenant($tenant)
            ->setName($businessName.' HQ');

        $clientOne = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 1')
            ->setPhone($phonePrefix.'1');

        $clientTwo = (new Client())
            ->setTenant($tenant)
            ->setFullName($clientPrefix.' - Client 2')
            ->setPhone($phonePrefix.'2');

        $start = new \DateTimeImmutable($appointmentStart);
        $appointment = (new Appointment())
            ->setTenant($tenant)
            ->setClient($clientOne)
            ->setStaff($staff)
            ->setLocation($location)
            ->setStartTime($start)
            ->setEndTime($start->modify('+30 minutes'));

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($location);
        $this->em->persist($clientOne);
        $this->em->persist($clientTwo);
        $this->em->persist($appointment);
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
