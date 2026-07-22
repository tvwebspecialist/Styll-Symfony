<?php

declare(strict_types=1);

namespace App\Service;

final readonly class GoogleStaffProvisioningInput
{
    public function __construct(
        public string $email,
        public string $businessName,
        public ?string $fullName = null,
        public ?string $businessType = null,
        public ?string $avatarUrl = null,
    ) {}
}
