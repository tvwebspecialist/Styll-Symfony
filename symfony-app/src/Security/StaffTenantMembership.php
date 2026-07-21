<?php

declare(strict_types=1);

namespace App\Security;

final readonly class StaffTenantMembership
{
    public function __construct(
        public string $staffMemberId,
        public string $tenantId,
        public string $tenantSlug,
        public string $businessName,
        public ?string $logoUrl,
        public string $status,
        public string $timezone,
        public string $role,
    ) {}

    /**
     * @return array{
     *     id: string,
     *     slug: string,
     *     businessName: string,
     *     logoUrl: ?string,
     *     status: string,
     *     timezone: string
     * }
     */
    public function toTenantArray(): array
    {
        return [
            'id' => $this->tenantId,
            'slug' => $this->tenantSlug,
            'businessName' => $this->businessName,
            'logoUrl' => $this->logoUrl,
            'status' => $this->status,
            'timezone' => $this->timezone,
        ];
    }

    /**
     * @return array{
     *     staffMemberId: string,
     *     role: string,
     *     tenant: array{
     *         id: string,
     *         slug: string,
     *         businessName: string,
     *         logoUrl: ?string,
     *         status: string,
     *         timezone: string
     *     }
     * }
     */
    public function toMembershipArray(): array
    {
        return [
            'staffMemberId' => $this->staffMemberId,
            'role' => $this->role,
            'tenant' => $this->toTenantArray(),
        ];
    }
}
