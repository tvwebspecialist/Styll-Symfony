<?php

declare(strict_types=1);

namespace App\Exception;

final class StaffRegistrationConflictException extends \RuntimeException
{
    public const EMAIL_ALREADY_USED = 'email_already_used';

    public function __construct(
        string $message,
        public readonly string $reason,
    ) {
        parent::__construct($message);
    }
}
