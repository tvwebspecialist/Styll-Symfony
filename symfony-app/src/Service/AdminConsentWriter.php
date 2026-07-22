<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Symfony\Component\Uid\Uuid;

final class AdminConsentWriter
{
    public function __construct(
        private readonly Connection $connection,
    ) {}

    /**
     * @param array<int, array<string, mixed>> $events
     */
    public function recordEvents(
        string $tenantId,
        string $clientId,
        string $actor,
        ?string $actorProfileId,
        string $source,
        array $events,
    ): int {
        if ($events === []) {
            return 0;
        }

        $client = $this->connection->fetchAssociative(
            <<<'SQL'
                SELECT marketing_consent, churn_opted_out
                FROM clients
                WHERE tenant_id = :tenant_id
                  AND id = :client_id
                  AND deleted_at IS NULL
                FOR UPDATE
            SQL,
            [
                'tenant_id' => $tenantId,
                'client_id' => $clientId,
            ],
        );

        if (!is_array($client)) {
            throw new \RuntimeException('Cliente non trovato per audit consenso.');
        }

        $marketingConsent = $this->toBool($client['marketing_consent'] ?? false);
        $churnOptedOut = $this->toBool($client['churn_opted_out'] ?? false);
        $inserted = 0;

        foreach ($events as $event) {
            $purpose = $this->requiredString($event, ['purpose']);
            $channel = $this->requiredString($event, ['channel']);
            $status = $this->requiredString($event, ['status']);
            $consentText = $this->requiredString($event, ['consentText', 'consent_text']);
            $consentTextVersion = $this->requiredString($event, ['consentTextVersion', 'consent_text_version']);
            $legalBasis = $this->requiredString($event, ['legalBasis', 'legal_basis']);
            $occurredAtRaw = $this->optionalString($event, ['occurredAt', 'occurred_at']);
            $occurredAt = $occurredAtRaw !== null
                ? (new \DateTimeImmutable($occurredAtRaw))->format(\DateTimeInterface::ATOM)
                : (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
            $ipAddress = $this->optionalString($event, ['ipAddress', 'ip_address']);
            $userAgent = $this->optionalString($event, ['userAgent', 'user_agent']);
            $metadata = $event['metadata'] ?? [];
            if (!is_array($metadata)) {
                $metadata = [];
            }

            $previousStatus = $this->connection->fetchOne(
                <<<'SQL'
                    SELECT status
                    FROM consent_events
                    WHERE tenant_id = :tenant_id
                      AND client_id = :client_id
                      AND purpose = :purpose
                    ORDER BY occurred_at DESC, created_at DESC, id DESC
                    LIMIT 1
                SQL,
                [
                    'tenant_id' => $tenantId,
                    'client_id' => $clientId,
                    'purpose' => $purpose,
                ],
            );

            $this->connection->insert('consent_events', [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $tenantId,
                'client_id' => $clientId,
                'purpose' => $purpose,
                'channel' => $channel,
                'status' => $status,
                'previous_status' => is_string($previousStatus) && $previousStatus !== '' ? $previousStatus : 'UNKNOWN',
                'consent_text' => $consentText,
                'consent_text_version' => $consentTextVersion,
                'legal_basis' => $legalBasis,
                'source' => $source,
                'changed_by' => $actor,
                'changed_by_profile_id' => $actorProfileId,
                'occurred_at' => $occurredAt,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'metadata' => json_encode($metadata, \JSON_THROW_ON_ERROR),
                'created_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ]);

            ++$inserted;

            if (\in_array($purpose, ['MARKETING_EMAIL', 'MARKETING_PUSH'], true)) {
                $marketingConsent = $status === 'ALLOWED';
            }

            if ($purpose === 'CHURN_PROFILING') {
                $churnOptedOut = $status !== 'ALLOWED';
            }
        }

        $this->connection->update('clients', [
            'marketing_consent' => $marketingConsent ? 1 : 0,
            'churn_opted_out' => $churnOptedOut ? 1 : 0,
            'updated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], [
            'tenant_id' => $tenantId,
            'id' => $clientId,
        ]);

        return $inserted;
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $keys
     */
    private function requiredString(array $payload, array $keys): string
    {
        $value = $this->optionalString($payload, $keys);
        if ($value === null || $value === '') {
            throw new \RuntimeException(sprintf('Campo consenso mancante: %s', implode('/', $keys)));
        }

        return $value;
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string> $keys
     */
    private function optionalString(array $payload, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $payload)) {
                continue;
            }

            if ($payload[$key] === null) {
                return null;
            }

            if (is_string($payload[$key])) {
                $value = trim($payload[$key]);

                return $value !== '' ? $value : null;
            }
        }

        return null;
    }

    private function toBool(mixed $value): bool
    {
        return filter_var($value, \FILTER_VALIDATE_BOOL, \FILTER_NULL_ON_FAILURE) ?? false;
    }
}
