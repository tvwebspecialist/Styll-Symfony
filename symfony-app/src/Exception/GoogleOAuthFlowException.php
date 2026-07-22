<?php

declare(strict_types=1);

namespace App\Exception;

final class GoogleOAuthFlowException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $reason,
        public readonly int $statusCode = 400,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    public static function badRequest(string $message): self
    {
        return new self($message, 'bad_request', 400);
    }

    public static function configuration(string $message): self
    {
        return new self($message, 'configuration_error', 503);
    }

    public static function invalidState(string $message = 'State OAuth non valido.'): self
    {
        return new self($message, 'invalid_state', 400);
    }

    public static function providerFailure(string $message, ?\Throwable $previous = null): self
    {
        return new self($message, 'provider_failure', 502, $previous);
    }

    public static function staffAccountNotFound(): self
    {
        return new self(
            'Per questa email non esiste ancora un account staff. Completa prima la registrazione.',
            'staff_account_not_found',
            404,
        );
    }

    public static function tenantNotFound(): self
    {
        return new self('Tenant non valido o non attivo.', 'tenant_not_found', 404);
    }
}
