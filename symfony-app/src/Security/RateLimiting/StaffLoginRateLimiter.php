<?php

declare(strict_types=1);

namespace App\Security\RateLimiting;

use Symfony\Component\HttpFoundation\RateLimiter\AbstractRequestRateLimiter;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\LimiterInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Security\Http\SecurityRequestAttributes;

final class StaffLoginRateLimiter extends AbstractRequestRateLimiter
{
    public function __construct(
        private readonly RateLimitKeyGenerator $keyGenerator,
        private readonly RateLimiterFactoryInterface $globalFactory,
        private readonly RateLimiterFactoryInterface $localFactory,
    ) {}

    /**
     * @return list<LimiterInterface>
     */
    protected function getLimiters(Request $request): array
    {
        $limiters = [
            $this->globalFactory->create($this->keyGenerator->ip($request->getClientIp())),
        ];

        $username = (string) $request->attributes->get(SecurityRequestAttributes::LAST_USERNAME, '');
        $username = preg_match('//u', $username) ? mb_strtolower($username, 'UTF-8') : strtolower($username);

        if ($username !== '') {
            $limiters[] = $this->localFactory->create(
                $this->keyGenerator->identifierWithIp($request->getClientIp(), $username),
            );
        }

        return $limiters;
    }
}
