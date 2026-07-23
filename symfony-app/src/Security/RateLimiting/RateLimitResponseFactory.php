<?php

declare(strict_types=1);

namespace App\Security\RateLimiting;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimit;

final class RateLimitResponseFactory
{
    public const GENERIC_MESSAGE = 'Troppe richieste. Riprova più tardi.';

    public function create(RateLimit $rateLimit): JsonResponse
    {
        $retryAfterSeconds = max(1, $rateLimit->getRetryAfter()->getTimestamp() - time());

        return new JsonResponse(
            ['error' => self::GENERIC_MESSAGE],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $retryAfterSeconds],
        );
    }
}
