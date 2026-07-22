<?php

declare(strict_types=1);

namespace App\Service;

final readonly class GoogleOAuthIdentity
{
    public function __construct(
        public string $email,
        public string $googleId,
        public string $fullName,
        public ?string $avatarUrl,
        public string $idToken,
        public string $accessToken,
    ) {}
}
