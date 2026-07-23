<?php

declare(strict_types=1);

namespace App\Security;

use App\Security\RateLimiting\RateLimitResponseFactory;
use Lexik\Bundle\JWTAuthenticationBundle\Security\Http\Authentication\AuthenticationFailureHandler;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\TooManyLoginAttemptsAuthenticationException;

final class ApiAuthenticationFailureHandler extends AuthenticationFailureHandler
{
    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): Response
    {
        if ($exception instanceof TooManyLoginAttemptsAuthenticationException) {
            return new JsonResponse(
                ['error' => RateLimitResponseFactory::GENERIC_MESSAGE],
                Response::HTTP_TOO_MANY_REQUESTS,
            );
        }

        return parent::onAuthenticationFailure($request, $exception);
    }
}
