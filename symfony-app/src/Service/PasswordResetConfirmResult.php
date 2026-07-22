<?php

declare(strict_types=1);

namespace App\Service;

final class PasswordResetConfirmResult
{
    private function __construct(
        public readonly bool $success,
        public readonly ?string $error = null,
    ) {}

    public static function ok(): self
    {
        return new self(true);
    }

    public static function invalid(string $error): self
    {
        return new self(false, $error);
    }
}
