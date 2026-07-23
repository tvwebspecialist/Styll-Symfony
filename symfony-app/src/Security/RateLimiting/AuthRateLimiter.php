<?php

declare(strict_types=1);

namespace App\Security\RateLimiting;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\LimiterInterface;
use Symfony\Component\RateLimiter\RateLimit;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

final class AuthRateLimiter
{
    public function __construct(
        private readonly RateLimitKeyGenerator $keyGenerator,
        private readonly RateLimiterFactoryInterface $passwordResetRequestIpFactory,
        private readonly RateLimiterFactoryInterface $passwordResetRequestEmailIpFactory,
        private readonly RateLimiterFactoryInterface $passwordResetConfirmIpFactory,
        private readonly RateLimiterFactoryInterface $passwordResetConfirmTokenIpFactory,
        private readonly RateLimiterFactoryInterface $pwaOtpSendIpFactory,
        private readonly RateLimiterFactoryInterface $pwaOtpSendEmailIpFactory,
        private readonly RateLimiterFactoryInterface $pwaOtpVerifyIpFactory,
        private readonly RateLimiterFactoryInterface $pwaOtpVerifyEmailIpFactory,
        private readonly RateLimiterFactoryInterface $staffRegisterIpFactory,
        private readonly RateLimiterFactoryInterface $staffRegisterEmailIpFactory,
        private readonly RateLimiterFactoryInterface $googleStaffRegisterStartIpFactory,
    ) {}

    public function consumePasswordResetRequest(Request $request, string $email): ?RateLimit
    {
        return $this->consume(
            $request,
            $this->passwordResetRequestIpFactory,
            $this->passwordResetRequestEmailIpFactory,
            $email,
        );
    }

    public function checkPasswordResetConfirm(Request $request, string $token): ?RateLimit
    {
        return $this->peek(
            $request,
            $this->passwordResetConfirmIpFactory,
            $this->passwordResetConfirmTokenIpFactory,
            $token,
        );
    }

    public function registerPasswordResetConfirmFailure(Request $request, string $token): void
    {
        $this->consume(
            $request,
            $this->passwordResetConfirmIpFactory,
            $this->passwordResetConfirmTokenIpFactory,
            $token,
        );
    }

    public function consumePwaOtpSend(Request $request, string $email): ?RateLimit
    {
        return $this->consume(
            $request,
            $this->pwaOtpSendIpFactory,
            $this->pwaOtpSendEmailIpFactory,
            $email,
        );
    }

    public function checkPwaOtpVerify(Request $request, string $email): ?RateLimit
    {
        return $this->peek(
            $request,
            $this->pwaOtpVerifyIpFactory,
            $this->pwaOtpVerifyEmailIpFactory,
            $email,
        );
    }

    public function registerPwaOtpVerifyFailure(Request $request, string $email): void
    {
        $this->consume(
            $request,
            $this->pwaOtpVerifyIpFactory,
            $this->pwaOtpVerifyEmailIpFactory,
            $email,
        );
    }

    public function consumeStaffRegister(Request $request, string $email): ?RateLimit
    {
        return $this->consume(
            $request,
            $this->staffRegisterIpFactory,
            $this->staffRegisterEmailIpFactory,
            $email,
        );
    }

    public function consumeGoogleStaffRegisterStart(Request $request): ?RateLimit
    {
        return $this->consume($request, $this->googleStaffRegisterStartIpFactory);
    }

    private function consume(
        Request $request,
        RateLimiterFactoryInterface $ipFactory,
        ?RateLimiterFactoryInterface $identifierFactory = null,
        ?string $identifier = null,
    ): ?RateLimit {
        $rateLimit = $this->evaluate(
            $this->buildLimiters($request, $ipFactory, $identifierFactory, $identifier),
            1,
        );

        return $rateLimit !== null && !$rateLimit->isAccepted() ? $rateLimit : null;
    }

    private function peek(
        Request $request,
        RateLimiterFactoryInterface $ipFactory,
        ?RateLimiterFactoryInterface $identifierFactory = null,
        ?string $identifier = null,
    ): ?RateLimit {
        $rateLimit = $this->evaluate(
            $this->buildLimiters($request, $ipFactory, $identifierFactory, $identifier),
            0,
        );

        return $rateLimit !== null && (!$rateLimit->isAccepted() || 0 === $rateLimit->getRemainingTokens())
            ? $rateLimit
            : null;
    }

    /**
     * @return list<LimiterInterface>
     */
    private function buildLimiters(
        Request $request,
        RateLimiterFactoryInterface $ipFactory,
        ?RateLimiterFactoryInterface $identifierFactory,
        ?string $identifier,
    ): array {
        $limiters = [
            $ipFactory->create($this->keyGenerator->ip($request->getClientIp())),
        ];

        $normalizedIdentifier = trim((string) $identifier);
        if ($identifierFactory !== null && $normalizedIdentifier !== '') {
            $limiters[] = $identifierFactory->create(
                $this->keyGenerator->identifierWithIp($request->getClientIp(), $normalizedIdentifier),
            );
        }

        return $limiters;
    }

    /**
     * @param list<LimiterInterface> $limiters
     */
    private function evaluate(array $limiters, int $tokens): ?RateLimit
    {
        $minimalRateLimit = null;

        foreach ($limiters as $limiter) {
            $rateLimit = $limiter->consume($tokens);
            $minimalRateLimit = $minimalRateLimit !== null
                ? self::getMinimalRateLimit($minimalRateLimit, $rateLimit)
                : $rateLimit;
        }

        return $minimalRateLimit;
    }

    private static function getMinimalRateLimit(RateLimit $first, RateLimit $second): RateLimit
    {
        if ($first->isAccepted() !== $second->isAccepted()) {
            return $first->isAccepted() ? $second : $first;
        }

        $firstRemainingTokens = $first->getRemainingTokens();
        $secondRemainingTokens = $second->getRemainingTokens();

        if ($firstRemainingTokens === $secondRemainingTokens) {
            return $first->getRetryAfter() < $second->getRetryAfter() ? $second : $first;
        }

        return $firstRemainingTokens > $secondRemainingTokens ? $second : $first;
    }
}
