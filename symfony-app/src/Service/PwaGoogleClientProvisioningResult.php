<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Client;
use App\Entity\Tenant;
use App\Entity\User;

final readonly class PwaGoogleClientProvisioningResult
{
    public function __construct(
        public User $user,
        public Tenant $tenant,
        public Client $client,
        public bool $isNewClient,
    ) {}
}
