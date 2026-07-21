<?php

declare(strict_types=1);

namespace App\Security;

final readonly class ResolvedStaffAccess
{
    /**
     * @param list<StaffTenantMembership> $memberships
     */
    public function __construct(
        public array $memberships,
        public ?StaffTenantMembership $currentMembership,
        public ?string $requestedTenantSlug,
    ) {}

    public function hasRequestedTenantSelection(): bool
    {
        return $this->requestedTenantSlug !== null;
    }

    /**
     * @return list<StaffTenantMembership>
     */
    public function otherMemberships(): array
    {
        if ($this->currentMembership === null) {
            return $this->memberships;
        }

        return array_values(array_filter(
            $this->memberships,
            fn (StaffTenantMembership $membership): bool => $membership->staffMemberId !== $this->currentMembership->staffMemberId,
        ));
    }
}
