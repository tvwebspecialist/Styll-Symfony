<?php

declare(strict_types=1);

namespace App\Service;

use App\Exception\GoogleOAuthFlowException;

final readonly class GoogleOAuthStatePayload
{
    public function __construct(
        public string $context,
        public string $nonce,
        public int $issuedAt,
        public ?string $redirectTo = null,
        public ?string $returnTo = null,
        public ?string $tenantSlug = null,
        public ?string $fullName = null,
        public ?string $businessName = null,
        public ?string $businessType = null,
    ) {}

    /**
     * @return array{
     *     context: string,
     *     nonce: string,
     *     issued_at: int,
     *     redirect_to?: string,
     *     return_to?: string,
     *     tenant_slug?: string,
     *     full_name?: string,
     *     business_name?: string,
     *     business_type?: string
     * }
     */
    public function toArray(): array
    {
        return array_filter([
            'context' => $this->context,
            'nonce' => $this->nonce,
            'issued_at' => $this->issuedAt,
            'redirect_to' => $this->redirectTo,
            'return_to' => $this->returnTo,
            'tenant_slug' => $this->tenantSlug,
            'full_name' => $this->fullName,
            'business_name' => $this->businessName,
            'business_type' => $this->businessType,
        ], static fn (mixed $value): bool => $value !== null);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $context = trim((string) ($data['context'] ?? ''));
        $nonce = trim((string) ($data['nonce'] ?? ''));
        $issuedAt = (int) ($data['issued_at'] ?? 0);

        if (!GoogleOAuthContext::isSupported($context) || $nonce === '' || $issuedAt <= 0) {
            throw GoogleOAuthFlowException::invalidState();
        }

        return new self(
            context: $context,
            nonce: $nonce,
            issuedAt: $issuedAt,
            redirectTo: self::optionalString($data['redirect_to'] ?? null),
            returnTo: self::optionalString($data['return_to'] ?? null),
            tenantSlug: self::optionalString($data['tenant_slug'] ?? null),
            fullName: self::optionalString($data['full_name'] ?? null),
            businessName: self::optionalString($data['business_name'] ?? null),
            businessType: self::optionalString($data['business_type'] ?? null),
        );
    }

    private static function optionalString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
