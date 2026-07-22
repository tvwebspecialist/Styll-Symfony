<?php

declare(strict_types=1);

namespace App\Service;

use App\Exception\GoogleOAuthFlowException;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use League\OAuth2\Client\Provider\Google;
use League\OAuth2\Client\Provider\GoogleUser;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class LeagueGoogleOAuthProvider implements GoogleOAuthProviderInterface
{
    private static ?GoogleOAuthProviderInterface $testOverride = null;

    public function __construct(
        #[Autowire('%env(string:GOOGLE_CLIENT_ID)%')]
        private readonly string $clientId,
        #[Autowire('%env(string:GOOGLE_CLIENT_SECRET)%')]
        private readonly string $clientSecret,
    ) {}

    public static function setTestOverride(?GoogleOAuthProviderInterface $provider): void
    {
        self::$testOverride = $provider;
    }

    public function getAuthorizationUrl(string $redirectUri, string $state): string
    {
        if (self::$testOverride instanceof GoogleOAuthProviderInterface) {
            return self::$testOverride->getAuthorizationUrl($redirectUri, $state);
        }

        return $this->buildProvider($redirectUri)->getAuthorizationUrl([
            'scope' => ['openid', 'email', 'profile'],
            'state' => $state,
            'access_type' => 'offline',
            'prompt' => 'consent',
        ]);
    }

    public function exchangeCodeForIdentity(string $redirectUri, string $code): GoogleOAuthIdentity
    {
        if (self::$testOverride instanceof GoogleOAuthProviderInterface) {
            return self::$testOverride->exchangeCodeForIdentity($redirectUri, $code);
        }

        $provider = $this->buildProvider($redirectUri);

        try {
            $accessToken = $provider->getAccessToken('authorization_code', [
                'code' => $code,
            ]);
        } catch (IdentityProviderException $exception) {
            throw GoogleOAuthFlowException::providerFailure(
                'Google OAuth code exchange fallito.',
                $exception,
            );
        }

        try {
            $resourceOwner = $provider->getResourceOwner($accessToken);
        } catch (IdentityProviderException $exception) {
            throw GoogleOAuthFlowException::providerFailure(
                'Recupero profilo Google fallito.',
                $exception,
            );
        }

        if (!$resourceOwner instanceof GoogleUser) {
            throw GoogleOAuthFlowException::providerFailure('Google non ha restituito un profilo valido.');
        }

        $email = mb_strtolower(trim((string) $resourceOwner->getEmail()));
        if ($email === '') {
            throw GoogleOAuthFlowException::providerFailure('Google non ha restituito un indirizzo email valido.');
        }

        $tokenValues = $accessToken->getValues();
        $idToken = trim((string) ($tokenValues['id_token'] ?? ''));
        if ($idToken === '') {
            throw GoogleOAuthFlowException::providerFailure('Google non ha restituito un id_token utilizzabile.');
        }

        $fullName = trim((string) $resourceOwner->getName());

        return new GoogleOAuthIdentity(
            email: $email,
            googleId: trim((string) $resourceOwner->getId()),
            fullName: $fullName,
            avatarUrl: $this->normalizeOptionalString($resourceOwner->getAvatar()),
            idToken: $idToken,
            accessToken: $accessToken->getToken(),
        );
    }

    private function buildProvider(string $redirectUri): Google
    {
        if (trim($this->clientId) === '' || trim($this->clientSecret) === '') {
            throw GoogleOAuthFlowException::configuration(
                'Google OAuth non configurato. Imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
            );
        }

        return new Google([
            'clientId' => trim($this->clientId),
            'clientSecret' => trim($this->clientSecret),
            'redirectUri' => $redirectUri,
        ]);
    }

    private function normalizeOptionalString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
