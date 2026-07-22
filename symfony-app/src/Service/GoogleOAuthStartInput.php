<?php

declare(strict_types=1);

namespace App\Service;

final readonly class GoogleOAuthStartInput
{
    public function __construct(
        public string $context,
        public string $redirectUri,
        public ?string $redirectTo = null,
        public ?string $returnTo = null,
        public ?string $tenantSlug = null,
        public ?string $fullName = null,
        public ?string $businessName = null,
        public ?string $businessType = null,
        public bool $acceptedTerms = false,
    ) {}
}
