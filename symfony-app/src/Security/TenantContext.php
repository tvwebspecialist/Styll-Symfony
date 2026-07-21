<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Resolves the current tenant_id from the authenticated user's JWT.
 *
 * Replaces Supabase's auth.uid() / get_my_tenant_id() pattern.
 * The tenant_id is derived from the StaffMember record linked to the
 * authenticated User, NOT hard-coded into the JWT — this avoids stale
 * tokens when staff are removed from a tenant.
 *
 * Injected as a service and used by TenantFilter and all controllers.
 */
final class TenantContext
{
    private ?Uuid $resolvedTenantId = null;
    private bool $resolved = false;

    public function __construct(
        private readonly TokenStorageInterface $tokenStorage,
        private readonly StaffTenantAccessResolver $staffTenantAccessResolver,
    ) {}

    /**
     * Returns the tenant_id for the currently authenticated staff user.
     * Returns null for unauthenticated requests or admin users without a tenant.
     */
    public function getTenantId(): ?Uuid
    {
        if ($this->resolved) {
            return $this->resolvedTenantId;
        }

        $this->resolved = true;
        $this->resolvedTenantId = $this->resolve();

        return $this->resolvedTenantId;
    }

    /** Reset cached value (useful in tests between requests). */
    public function reset(): void
    {
        $this->resolved = false;
        $this->resolvedTenantId = null;
    }

    private function resolve(): ?Uuid
    {
        $token = $this->tokenStorage->getToken();
        if ($token === null) {
            return null;
        }

        $user = $token->getUser();
        if (!$user instanceof User) {
            return null;
        }

        $currentMembership = $this->staffTenantAccessResolver->resolveForUser($user)->currentMembership;
        if ($currentMembership === null) {
            return null;
        }

        return Uuid::fromString($currentMembership->tenantId);
    }
}
