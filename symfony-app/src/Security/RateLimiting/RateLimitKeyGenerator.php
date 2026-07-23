<?php

declare(strict_types=1);

namespace App\Security\RateLimiting;

final class RateLimitKeyGenerator
{
    public function __construct(
        #[\SensitiveParameter]
        private readonly string $secret,
    ) {
        if ($this->secret === '') {
            throw new \InvalidArgumentException('A non-empty secret is required.');
        }
    }

    public function ip(?string $ipAddress): string
    {
        return $this->hash('ip', $this->normalizeIp($ipAddress));
    }

    public function identifierWithIp(?string $ipAddress, string $identifier): string
    {
        $normalizedIdentifier = trim($identifier);
        if ($normalizedIdentifier === '') {
            throw new \InvalidArgumentException('The identifier used for rate limiting cannot be empty.');
        }

        return $this->hash('identifier', $normalizedIdentifier.'|'.$this->normalizeIp($ipAddress));
    }

    private function normalizeIp(?string $ipAddress): string
    {
        $normalized = trim((string) $ipAddress);

        return $normalized !== '' ? $normalized : 'unknown';
    }

    private function hash(string $namespace, string $value): string
    {
        return strtr(
            substr(base64_encode(hash_hmac('sha256', $namespace.'|'.$value, $this->secret, true)), 0, 32),
            '/+',
            '._',
        );
    }
}
