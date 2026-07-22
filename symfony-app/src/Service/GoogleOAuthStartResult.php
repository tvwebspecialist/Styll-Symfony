<?php

declare(strict_types=1);

namespace App\Service;

final readonly class GoogleOAuthStartResult
{
    public function __construct(
        public string $authorizationUrl,
        public string $stateToken,
        public int $stateCookieMaxAge = GoogleOAuthStateSigner::TTL_SECONDS,
    ) {}
}
