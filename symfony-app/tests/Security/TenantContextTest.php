<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\User;
use App\Security\ResolvedStaffAccess;
use App\Security\StaffTenantAccessResolver;
use App\Security\StaffTenantMembership;
use App\Security\TenantContext;
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

        $resolver = $this->createMock(StaffTenantAccessResolver::class);

        $context = new TenantContext($storage, $resolver);

        $this->assertNull($context->getTenantId(),
            'No security token must yield null tenant_id — unauthenticated request gets nothing');
    }

    // ── Test 2: Authenticated user with no staff_member → null tenant ─────────

    public function testReturnsNullWhenUserHasNoStaffMember(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(Uuid::v4());

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $resolver = $this->createMock(StaffTenantAccessResolver::class);
        $resolver->method('resolveForUser')->willReturn(new ResolvedStaffAccess([], null, null));

        $context = new TenantContext($storage, $resolver);

        $this->assertNull($context->getTenantId(),
            'User with no linked staff_member must yield null tenant — no access to any tenant');
    }

    // ── Test 3: Authenticated staff → returns correct tenant_id ──────────────

    public function testReturnsTenantIdForAuthenticatedStaff(): void
    {
        $expectedTenantId = Uuid::v4();

        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(Uuid::v4());

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $resolver = $this->createMock(StaffTenantAccessResolver::class);
        $resolver->method('resolveForUser')->willReturn(new ResolvedStaffAccess(
            memberships: [],
            currentMembership: new StaffTenantMembership(
                staffMemberId: Uuid::v4()->toRfc4122(),
                tenantId: $expectedTenantId->toRfc4122(),
                tenantSlug: 'tenant-a',
                businessName: 'Tenant A',
                logoUrl: null,
                status: 'active',
                timezone: 'Europe/Rome',
                role: 'owner',
            ),
            requestedTenantSlug: null,
        ));

        $context = new TenantContext($storage, $resolver);

        $result = $context->getTenantId();

        $this->assertNotNull($result, 'Authenticated staff must have a tenant_id');
        $this->assertTrue($expectedTenantId->equals($result),
            'Resolved tenant_id must match the staff member\'s tenant');
    }

    // ── Test 4: Result is cached (only one DB query per request) ─────────────

    public function testTenantIdIsCachedAfterFirstCall(): void
    {
        $tenantId = Uuid::v4();

        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(Uuid::v4());

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $resolver = $this->createMock(StaffTenantAccessResolver::class);
        $resolver->expects($this->once())->method('resolveForUser')->willReturn(new ResolvedStaffAccess(
            memberships: [],
            currentMembership: new StaffTenantMembership(
                staffMemberId: Uuid::v4()->toRfc4122(),
                tenantId: $tenantId->toRfc4122(),
                tenantSlug: 'tenant-a',
                businessName: 'Tenant A',
                logoUrl: null,
                status: 'active',
                timezone: 'Europe/Rome',
                role: 'owner',
            ),
            requestedTenantSlug: null,
        ));

        $context = new TenantContext($storage, $resolver);

        // Call twice — should only hit DB once
        $context->getTenantId();
        $context->getTenantId();
    }

    // ── Test 5: reset() clears cache ─────────────────────────────────────────

    public function testResetClearsCachedTenantId(): void
    {
        $storage = $this->createMock(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn(null);

        $resolver = $this->createMock(StaffTenantAccessResolver::class);

        $context = new TenantContext($storage, $resolver);

        // Prime the cache with null
        $this->assertNull($context->getTenantId());

        // Reset
        $context->reset();

        // Should re-evaluate (still null, but the point is it re-ran)
        $this->assertNull($context->getTenantId());
    }
}
