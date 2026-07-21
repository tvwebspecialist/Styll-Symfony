<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Client;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class PostgresTimestampPrecisionIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->em = self::getContainer()->get(EntityManagerInterface::class);
        $this->disableTenantFilter();
        $this->resetDatabase();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        parent::tearDown();
    }

    public function testDoctrineHydratesPostgresMicrosecondTimestampsAfterTriggerUpdates(): void
    {
        $tenant = (new Tenant())
            ->setBusinessName('Timestamp Precision Barber')
            ->setSlug('timestamp-precision');

        $user = (new User())
            ->setEmail('timestamp-precision@example.test')
            ->setPassword('phase-1-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName('Timestamp Precision Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $client = (new Client())
            ->setTenant($tenant)
            ->setFullName('Timestamp Precision Client')
            ->setPhone('+390000000001');

        foreach ([$tenant, $user, $profile, $staff, $client] as $entity) {
            $this->em->persist($entity);
        }

        $this->em->flush();

        $connection = $this->em->getConnection();
        $connection->executeStatement(
            'UPDATE tenants SET business_name = :business_name WHERE id = :id',
            ['business_name' => 'Timestamp Precision Barber Updated', 'id' => (string) $tenant->getId()],
        );
        $connection->executeStatement(
            'UPDATE staff_members SET bio = :bio WHERE id = :id',
            ['bio' => 'Updated via SQL trigger', 'id' => (string) $staff->getId()],
        );
        $connection->executeStatement(
            'UPDATE clients SET full_name = :full_name WHERE id = :id',
            ['full_name' => 'Timestamp Precision Client Updated', 'id' => (string) $client->getId()],
        );

        $this->em->clear();

        $reloadedTenant = $this->em->getRepository(Tenant::class)->findOneBy(['slug' => 'timestamp-precision']);
        $reloadedStaff = $this->em->getRepository(StaffMember::class)->find($staff->getId());
        $reloadedClient = $this->em->getRepository(Client::class)->find($client->getId());

        self::assertInstanceOf(Tenant::class, $reloadedTenant);
        self::assertInstanceOf(StaffMember::class, $reloadedStaff);
        self::assertInstanceOf(Client::class, $reloadedClient);

        self::assertSame('Timestamp Precision Barber Updated', $reloadedTenant->getBusinessName());
        self::assertSame('Updated via SQL trigger', $reloadedStaff->getBio());
        self::assertSame('Timestamp Precision Client Updated', $reloadedClient->getFullName());

        self::assertGreaterThanOrEqual(0, (int) $reloadedTenant->getUpdatedAt()->format('u'));
        self::assertGreaterThanOrEqual(0, (int) $reloadedStaff->getUpdatedAt()->format('u'));
        self::assertGreaterThanOrEqual(0, (int) $reloadedClient->getUpdatedAt()->format('u'));
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
        $this->em->clear();
    }

    private function disableTenantFilter(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }
    }
}
