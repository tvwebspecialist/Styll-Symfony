<?php

declare(strict_types=1);

namespace App\Tests\Doctrine;

use App\Doctrine\TenantFilter;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\ORM\Query\FilterCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

/**
 * Tests for TenantFilter — multi-tenant isolation (D6 in MIGRATION-LOG.md).
 *
 * SQLFilter::__construct and getParameter are both final in Doctrine ORM 3,
 * so we instantiate TenantFilter directly with a mocked EntityManager chain
 * and drive it via the public setParameter / addFilterConstraint API.
 *
 * Test matrix per spec:
 * 1. Tenant A cannot read rows of Tenant B → filter adds WHERE clause with tenant_id
 * 2. Tenant A cannot write rows of Tenant B → enforced by entity validation in controllers
 *    (the filter only affects SELECT; write protection is tested in controller tests)
 * 3. Unauthenticated requests return no rows → filter enabled without tenant_id returns "1=0"
 */
class TenantFilterTest extends TestCase
{
    private function buildFilter(array $parameters = []): TenantFilter
    {
        // getParameter internally calls $em->getConnection()->quote()
        $connection = $this->createMock(Connection::class);
        $connection->method('quote')->willReturnCallback(fn (string $v): string => "'$v'");

        // setParameter internally calls $em->getFilters()->setFiltersStateDirty()
        $filterCollection = $this->createMock(FilterCollection::class);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('getConnection')->willReturn($connection);
        $em->method('getFilters')->willReturn($filterCollection);

        $filter = new TenantFilter($em);

        foreach ($parameters as $name => $value) {
            $filter->setParameter($name, $value);
        }

        return $filter;
    }

    private function buildMetaWithTenantId(string $entityClass): ClassMetadata
    {
        $meta = $this->createMock(ClassMetadata::class);
        $meta->method('getName')->willReturn($entityClass);
        $meta->method('getAssociationMappings')->willReturn([
            'tenant' => [
                'joinColumns' => [['name' => 'tenant_id']],
            ],
        ]);
        $meta->method('getColumnNames')->willReturn(['id', 'tenant_id', 'full_name']);

        return $meta;
    }

    private function buildMetaWithoutTenantId(string $entityClass): ClassMetadata
    {
        $meta = $this->createMock(ClassMetadata::class);
        $meta->method('getName')->willReturn($entityClass);
        $meta->method('getAssociationMappings')->willReturn([]);
        $meta->method('getColumnNames')->willReturn(['id', 'email', 'password']);

        return $meta;
    }

    // ── Test 1: Filter adds WHERE clause for tenant-scoped entities ────────────

    public function testFilterAddsWhereClauseForClientEntity(): void
    {
        $tenantId = Uuid::v4()->toRfc4122();
        $filter = $this->buildFilter(['tenant_id' => $tenantId]);
        $meta = $this->buildMetaWithTenantId('App\Entity\Client');

        $result = $filter->addFilterConstraint($meta, 'c');

        $this->assertStringContainsString('c.tenant_id', $result,
            'Filter must add tenant_id constraint for Client entity');
        $this->assertStringContainsString($tenantId, $result,
            'Filter must embed the actual tenant UUID');
    }

    public function testFilterAddsWhereClauseForAppointmentEntity(): void
    {
        $tenantId = Uuid::v4()->toRfc4122();
        $filter = $this->buildFilter(['tenant_id' => $tenantId]);
        $meta = $this->buildMetaWithTenantId('App\Entity\Appointment');

        $result = $filter->addFilterConstraint($meta, 'a');

        $this->assertStringContainsString('a.tenant_id', $result,
            'Filter must add tenant_id constraint for Appointment entity');
    }

    // ── Test 2: Different tenant gets different WHERE clause (cross-tenant isolation) ───

    public function testTenantAAndBGetDifferentConstraints(): void
    {
        $tenantA = Uuid::v4()->toRfc4122();
        $tenantB = Uuid::v4()->toRfc4122();

        $filterA = $this->buildFilter(['tenant_id' => $tenantA]);
        $filterB = $this->buildFilter(['tenant_id' => $tenantB]);
        $meta = $this->buildMetaWithTenantId('App\Entity\Client');

        $resultA = $filterA->addFilterConstraint($meta, 'c');
        $resultB = $filterB->addFilterConstraint($meta, 'c');

        $this->assertStringContainsString($tenantA, $resultA,
            'Filter for tenant A must contain tenant A UUID');
        $this->assertStringContainsString($tenantB, $resultB,
            'Filter for tenant B must contain tenant B UUID');
        $this->assertNotSame($resultA, $resultB,
            'Constraints for different tenants MUST differ — cross-tenant isolation violated');
    }

    // ── Test 3: Unauthenticated request (no tenant_id set) → block all rows ───

    public function testFilterWithoutTenantIdBlocksAllRows(): void
    {
        // No parameters set — getParameter throws InvalidArgumentException → fail-closed
        $filter = $this->buildFilter([]);
        $meta = $this->buildMetaWithTenantId('App\Entity\Client');

        $result = $filter->addFilterConstraint($meta, 'c');

        $this->assertSame('1 = 0', $result,
            'Filter enabled without tenant_id MUST block all rows (fail-closed, not fail-open)');
    }

    // ── Test 4: Global entities (User, Profile, Tenant) are NOT filtered ──────

    public function testUserEntityIsNotFiltered(): void
    {
        $filter = $this->buildFilter(['tenant_id' => Uuid::v4()->toRfc4122()]);
        $meta = $this->buildMetaWithoutTenantId('App\Entity\User');

        $result = $filter->addFilterConstraint($meta, 'u');

        $this->assertSame('', $result,
            'User entity (no tenant_id) MUST NOT be filtered');
    }

    public function testProfileEntityIsNotFiltered(): void
    {
        $filter = $this->buildFilter(['tenant_id' => Uuid::v4()->toRfc4122()]);
        $meta = $this->buildMetaWithoutTenantId('App\Entity\Profile');

        $result = $filter->addFilterConstraint($meta, 'p');

        $this->assertSame('', $result,
            'Profile entity (no tenant_id) MUST NOT be filtered');
    }

    // ── Test 5: ClientNote entity (tenant-scoped) is filtered ─────────────────

    public function testClientNoteEntityIsFiltered(): void
    {
        $tenantId = Uuid::v4()->toRfc4122();
        $filter = $this->buildFilter(['tenant_id' => $tenantId]);
        $meta = $this->buildMetaWithTenantId('App\Entity\ClientNote');

        $result = $filter->addFilterConstraint($meta, 'cn');

        $this->assertStringContainsString('cn.tenant_id', $result,
            'ClientNote (private staff notes) MUST be tenant-filtered');
    }
}
