<?php

declare(strict_types=1);

namespace App\Service;

final readonly class GoogleOAuthCompleteInput
{
    public function __construct(
        public string $code,
        public string $state,
        public string $stateCookie,
        public string $redirectUri,
    ) {}
}
