<?php

declare(strict_types=1);

namespace App\Service;

final class PwaClientOtpResult
{
    private function __construct(
        public readonly bool $success,
        public readonly bool $isNewClient = false,
        public readonly ?string $jwt = null,
        public readonly ?string $error = null,
    ) {}

    public static function ok(bool $isNewClient, string $jwt): self
    {
        return new self(true, $isNewClient, $jwt);
    }

    public static function fail(string $error): self
    {
        return new self(false, error: $error);
    }
}
