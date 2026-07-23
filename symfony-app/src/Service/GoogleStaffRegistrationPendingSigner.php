<?php

declare(strict_types=1);

namespace App\Service;

use App\Exception\GoogleOAuthFlowException;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class GoogleStaffRegistrationPendingSigner
{
    public const TTL_SECONDS = 1800;

    public function __construct(
        #[Autowire('%kernel.secret%')]
        private readonly string $appSecret,
    ) {}

    public function issue(GoogleStaffRegistrationPendingPayload $payload): string
    {
        $encodedPayload = $this->base64UrlEncode(
            json_encode($payload->toArray(), \JSON_THROW_ON_ERROR),
        );

        $signature = $this->base64UrlEncode(
            hash_hmac('sha256', $encodedPayload, $this->appSecret, true),
        );

        return sprintf('%s.%s', $encodedPayload, $signature);
    }

    public function verify(string $token): GoogleStaffRegistrationPendingPayload
    {
        $parts = explode('.', trim($token), 2);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        [$encodedPayload, $encodedSignature] = $parts;
        $expectedSignature = $this->base64UrlEncode(
            hash_hmac('sha256', $encodedPayload, $this->appSecret, true),
        );

        if (!hash_equals($expectedSignature, $encodedSignature)) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        try {
            $decodedPayload = $this->base64UrlDecode($encodedPayload);
            $payload = json_decode($decodedPayload, true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        if (!is_array($payload)) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        $pending = GoogleStaffRegistrationPendingPayload::fromArray($payload);
        if ($pending->issuedAt + self::TTL_SECONDS < time()) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google scaduta. Riprova.');
        }

        return $pending;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $padding = 4 - (strlen($value) % 4);
        if ($padding < 4) {
            $value .= str_repeat('=', $padding);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if (!is_string($decoded)) {
            throw GoogleOAuthFlowException::invalidState('Registrazione Google non valida o scaduta.');
        }

        return $decoded;
    }
}
