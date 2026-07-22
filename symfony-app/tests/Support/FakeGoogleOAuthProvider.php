<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Exception\GoogleOAuthFlowException;
use App\Service\GoogleOAuthIdentity;
use App\Service\GoogleOAuthProviderInterface;

final class FakeGoogleOAuthProvider implements GoogleOAuthProviderInterface
{
    /**
     * @param array<string, GoogleOAuthIdentity> $identitiesByCode
     */
    public function __construct(
        private readonly array $identitiesByCode,
    ) {}

    public function getAuthorizationUrl(string $redirectUri, string $state): string
    {
        return sprintf(
            'https://accounts.google.test/o/oauth2/v2/auth?redirect_uri=%s&state=%s',
            urlencode($redirectUri),
            urlencode($state),
        );
    }

    public function exchangeCodeForIdentity(string $redirectUri, string $code): GoogleOAuthIdentity
    {
        $identity = $this->identitiesByCode[$code] ?? null;
        if (!$identity instanceof GoogleOAuthIdentity) {
            throw GoogleOAuthFlowException::providerFailure('Google code di test non riconosciuto.');
        }

        return $identity;
    }
}
