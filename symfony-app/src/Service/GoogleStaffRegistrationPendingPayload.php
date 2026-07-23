<?php

declare(strict_types=1);

namespace App\Service;

use App\Exception\GoogleOAuthFlowException;

final readonly class GoogleStaffRegistrationPendingPayload
{
    public function __construct(
        public string $email,
        public int $issuedAt,
        public ?string $fullName = null,
        public ?string $avatarUrl = null,
    ) {}

    /**
     * @return array{
     *     email: string,
     *     issued_at: int,
     *     full_name?: string,
     *     avatar_url?: string
     * }
     */
    public function toArray(): array
    {
        return array_filter([
            'email' => $this->email,
            'issued_at' => $this->issuedAt,
            'full_name' => $this->fullName,
            'avatar_url' => $this->avatarUrl,
        ], static fn (mixed $value): bool => $value !== null);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        $email = mb_strtolower(trim((string) ($data['email'] ?? '')));
        $issuedAt = (int) ($data['issued_at'] ?? 0);

        if ($email === '' || !filter_var($email, \FILTER_VALIDATE_EMAIL) || $issuedAt <= 0) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        return new self(
            email: $email,
            issuedAt: $issuedAt,
            fullName: self::optionalString($data['full_name'] ?? null),
            avatarUrl: self::optionalString($data['avatar_url'] ?? null),
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
