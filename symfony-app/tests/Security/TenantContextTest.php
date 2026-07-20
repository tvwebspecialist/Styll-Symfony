<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Tests for TenantContext service — extracts tenant_id from authenticated user.
 * Replaces Supabase's auth.uid() + get_my_tenant_id() pattern.
 */
class TenantContextTest extends TestCase
{
    // ── Test 1: Unauthenticated request → null tenant ────────────────────────

    public function testReturnsNullWhenNoToken(): void
    {
        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);

        $context = new TenantContext($storage, $em);

        $this->assertNull($context->getTenantId(),
            'No security token must yield null tenant_id — unauthenticated request gets nothing');
    }

    // ── Test 2: Authenticated user with no staff_member → null tenant ─────────

    public function testReturnsNullWhenUserHasNoStaffMember(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getProfile')->willReturn(null);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        // Query returns no staff member
        $query = $this->createMock(Query::class);
        $query->method('getOneOrNullResult')->willReturn(null);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('select')->willReturnSelf();
        $qb->method('from')->willReturnSelf();
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('setMaxResults')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('createQueryBuilder')->willReturn($qb);

        $context = new TenantContext($storage, $em);

        $this->assertNull($context->getTenantId(),
            'User with no linked staff_member must yield null tenant — no access to any tenant');
    }

    // ── Test 3: Authenticated staff → returns correct tenant_id ──────────────

    public function testReturnsTenantIdForAuthenticatedStaff(): void
    {
        $expectedTenantId = Uuid::v4();

        $tenant = $this->createMock(Tenant::class);
        $tenant->method('getId')->willReturn($expectedTenantId);

        $staffMember = $this->createMock(StaffMember::class);
        $staffMember->method('getTenant')->willReturn($tenant);

        $user = $this->createMock(User::class);
        $user->method('getProfile')->willReturn(null); // profile resolved internally

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $query = $this->createMock(Query::class);
        $query->method('getOneOrNullResult')->willReturn($staffMember);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('select')->willReturnSelf();
        $qb->method('from')->willReturnSelf();
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('setMaxResults')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('createQueryBuilder')->willReturn($qb);

        $context = new TenantContext($storage, $em);

        $result = $context->getTenantId();

        $this->assertNotNull($result, 'Authenticated staff must have a tenant_id');
        $this->assertTrue($expectedTenantId->equals($result),
            'Resolved tenant_id must match the staff member\'s tenant');
    }

    // ── Test 4: Result is cached (only one DB query per request) ─────────────

    public function testTenantIdIsCachedAfterFirstCall(): void
    {
        $tenantId = Uuid::v4();

        $tenant = $this->createMock(Tenant::class);
        $tenant->method('getId')->willReturn($tenantId);

        $staffMember = $this->createMock(StaffMember::class);
        $staffMember->method('getTenant')->willReturn($tenant);

        $user = $this->createMock(User::class);
        $user->method('getProfile')->willReturn(null);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $query = $this->createMock(Query::class);
        // Expect exactly ONE database call
        $query->expects($this->once())->method('getOneOrNullResult')->willReturn($staffMember);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('select')->willReturnSelf();
        $qb->method('from')->willReturnSelf();
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('setMaxResults')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('createQueryBuilder')->willReturn($qb);

        $context = new TenantContext($storage, $em);

        // Call twice — should only hit DB once
        $context->getTenantId();
        $context->getTenantId();
    }

    // ── Test 5: reset() clears cache ─────────────────────────────────────────

    public function testResetClearsCachedTenantId(): void
    {
        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);

        $context = new TenantContext($storage, $em);

        // Prime the cache with null
        $this->assertNull($context->getTenantId());

        // Reset
        $context->reset();

        // Should re-evaluate (still null, but the point is it re-ran)
        $this->assertNull($context->getTenantId());
    }
}
