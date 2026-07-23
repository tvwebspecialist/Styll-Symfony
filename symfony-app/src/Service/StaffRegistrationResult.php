<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;

final readonly class StaffRegistrationResult
{
    public function __construct(
        public User $user,
        public Tenant $tenant,
        public StaffMember $staffMember,
    ) {}
}
