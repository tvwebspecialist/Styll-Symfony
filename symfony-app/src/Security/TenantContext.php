<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\StaffMember;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
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
        private readonly EntityManagerInterface $em,
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

        $staffMember = $this->em->createQueryBuilder()
            ->select('sm')
            ->from(StaffMember::class, 'sm')
            ->where('sm.profile = :profile')
            ->andWhere('sm.deletedAt IS NULL')
            ->andWhere('sm.isActive = true')
            ->setParameter('profile', $user->getProfile())
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if (!$staffMember instanceof StaffMember) {
            return null;
        }

        return $staffMember->getTenant()->getId();
    }
}
