<?php

declare(strict_types=1);

namespace App\Service;

final class GoogleOAuthContext
{
    public const STAFF_LOGIN = 'staff_login';
    public const STAFF_REGISTER = 'staff_register';
    public const PWA = 'pwa';

    public static function isSupported(string $context): bool
    {
        return in_array($context, [
            self::STAFF_LOGIN,
            self::STAFF_REGISTER,
            self::PWA,
        ], true);
    }
}
