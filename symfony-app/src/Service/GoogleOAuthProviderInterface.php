<?php

declare(strict_types=1);

namespace App\Service;

interface GoogleOAuthProviderInterface
{
    public function getAuthorizationUrl(string $redirectUri, string $state): string;

    public function exchangeCodeForIdentity(string $redirectUri, string $code): GoogleOAuthIdentity;
}
