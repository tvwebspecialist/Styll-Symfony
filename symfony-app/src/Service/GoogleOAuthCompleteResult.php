<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;

final readonly class GoogleOAuthCompleteResult
{
    private function __construct(
        public string $context,
        public ?User $staffUser,
        public ?string $redirectTo,
        public ?string $tenantSlug,
        public ?string $returnTo,
        public ?string $googleIdToken,
        public ?string $googleAccessToken,
        public bool $isNewClient,
    ) {}

    public static function staff(User $user, ?string $redirectTo): self
    {
        return new self(
            context: 'staff',
            staffUser: $user,
            redirectTo: $redirectTo,
            tenantSlug: null,
            returnTo: null,
            googleIdToken: null,
            googleAccessToken: null,
            isNewClient: false,
        );
    }

    public static function pwa(
        string $tenantSlug,
        ?string $returnTo,
        string $googleIdToken,
        string $googleAccessToken,
        bool $isNewClient,
    ): self {
        return new self(
            context: 'pwa',
            staffUser: null,
            redirectTo: null,
            tenantSlug: $tenantSlug,
            returnTo: $returnTo,
            googleIdToken: $googleIdToken,
            googleAccessToken: $googleAccessToken,
            isNewClient: $isNewClient,
        );
    }
}
