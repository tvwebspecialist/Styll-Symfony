<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Security\TenantContext;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Uid\Uuid;

/**
 * POST /api/clients/bulk-import
 *
 * Bulk insert clients from a parsed CSV payload. Authenticated staff only.
 * Duplicate strategy: SKIP — if a non-deleted client with the same phone (or email
 * as fallback when phone is absent) already exists in the tenant, the row is not
 * overwritten and counted as skipped. This is the safest strategy to avoid data loss.
 *
 * Input JSON:
 * {
 *   "rows": [ { "0": "Mario Rossi", "1": "+391234567890", ... } ],
 *   "mapping": { "0": "full_name", "1": "phone", "2": "email", "3": "tags" },
 *   "source": "csv_upload",
 *   "filename": "clienti.csv"   // optional
 * }
 *
 * Supported mapping fields: full_name, phone, email, date_of_birth, marketing_consent, tags, notes
 */
#[Route('/api/clients/bulk-import', methods: ['POST'])]
final class ClientBulkImportController extends AbstractController
{
    private const ALLOWED_FIELDS = ['full_name', 'phone', 'email', 'date_of_birth', 'marketing_consent', 'tags', 'notes'];
    private const MAX_ROWS = 10_000;
    private const CHUNK_SIZE = 500;
    private const LOOKUP_CHUNK = 200;

    public function __construct(
        private readonly Connection $connection,
        private readonly TenantContext $tenantContext,
        private readonly TokenStorageInterface $tokenStorage,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $tenantId = $this->tenantContext->getTenantId();
        if ($tenantId === null) {
            return $this->json(['error' => 'Non autorizzato.'], Response::HTTP_FORBIDDEN);
        }
        $tenantIdStr = $tenantId->toRfc4122();

        $initiatedBy = $this->resolveCurrentUserId();
        if ($initiatedBy === null) {
            return $this->json(['error' => 'Non autenticato.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $request->toArray();
        $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];
        $mapping = is_array($payload['mapping'] ?? null) ? $payload['mapping'] : [];
        $allowedSources = ['fresha', 'treatwell', 'booksy', 'csv_generic'];
        $rawSource = is_string($payload['source'] ?? null) ? $payload['source'] : null;
        $source = in_array($rawSource, $allowedSources, true) ? $rawSource : 'csv_generic';
        $filename = is_string($payload['filename'] ?? null) ? $payload['filename'] : null;

        if ($rows === []) {
            return $this->json(['error' => 'Nessuna riga da importare.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (count($rows) > self::MAX_ROWS) {
            return $this->json(['error' => sprintf('Massimo %d righe per importazione.', self::MAX_ROWS)], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $mapping = $this->sanitizeMapping($mapping);

        if (!in_array('full_name', $mapping, true)) {
            return $this->json(['error' => 'La colonna "Nome" deve essere mappata.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $hasPhone = in_array('phone', $mapping, true);
        $hasEmail = in_array('email', $mapping, true);

        // Build lookup sets for duplicate detection.
        [$lookupPhones, $lookupEmails] = $this->buildLookupKeys($rows, $mapping, $hasPhone, $hasEmail);

        // Fetch existing clients matching by phone or email.
        $existingByPhone = $this->fetchExistingByPhone($tenantIdStr, $lookupPhones);
        $existingByEmail = $this->fetchExistingByEmail($tenantIdStr, $lookupEmails);

        $toInsert = [];
        $skipped = 0;
        $errors = [];
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);

        foreach ($rows as $rowIndex => $row) {
            if (!is_array($row)) {
                continue;
            }

            $mapped = $this->applyMapping($row, $mapping);
            $fullName = trim((string) ($mapped['full_name'] ?? ''));

            if ($fullName === '') {
                $errors[] = ['rowIndex' => $rowIndex, 'message' => 'Nome obbligatorio.'];
                continue;
            }

            $phone = $this->normalizePhone($mapped['phone'] ?? null);
            $email = $this->normalizeEmail($mapped['email'] ?? null);

            // Duplicate check: phone first, email fallback.
            if ($phone !== null && isset($existingByPhone[$phone])) {
                ++$skipped;
                continue;
            }

            if ($email !== null && isset($existingByEmail[$email])) {
                ++$skipped;
                continue;
            }

            $toInsert[] = [
                'id' => Uuid::v4()->toRfc4122(),
                'tenant_id' => $tenantIdStr,
                'full_name' => $fullName,
                'phone' => $phone,
                'email' => $email,
                'date_of_birth' => $this->normalizeDate($mapped['date_of_birth'] ?? null),
                'marketing_consent' => $this->normalizeBool($mapped['marketing_consent'] ?? null) ? 1 : 0,
                'tags' => json_encode($this->normalizeTags($mapped['tags'] ?? ['imported']), \JSON_THROW_ON_ERROR),
                'preferred_contact_channel' => 'whatsapp',
                'churn_opted_out' => 0,
                'created_by' => $initiatedBy,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // Eagerly register in lookup maps to deduplicate within the batch itself.
            if ($phone !== null) {
                $existingByPhone[$phone] = true;
            }
            if ($email !== null) {
                $existingByEmail[$email] = true;
            }
        }

        $imported = 0;

        $this->connection->beginTransaction();

        try {
            foreach (array_chunk($toInsert, self::CHUNK_SIZE) as $chunk) {
                foreach ($chunk as $row) {
                    try {
                        $this->connection->insert('clients', $row);
                        ++$imported;
                    } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException) {
                        ++$skipped;
                    }
                }
            }

            $jobId = Uuid::v4()->toRfc4122();
            $this->connection->insert('client_import_jobs', [
                'id' => $jobId,
                'tenant_id' => $tenantIdStr,
                'initiated_by' => $initiatedBy,
                'source' => $source,
                'filename' => $filename,
                'total_rows' => count($rows),
                'imported_count' => $imported,
                'merged_count' => 0,
                'skipped_count' => $skipped,
                'error_count' => count($errors),
                'errors' => json_encode(array_slice($errors, 0, 100), \JSON_THROW_ON_ERROR),
                'status' => $errors === [] ? 'completed' : 'completed_with_errors',
                'created_at' => $now,
            ]);

            $this->connection->commit();
        } catch (\Throwable $e) {
            if ($this->connection->isTransactionActive()) {
                $this->connection->rollBack();
            }

            throw $e;
        }

        return $this->json([
            'success' => true,
            'jobId' => $jobId,
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
            'status' => $errors === [] ? 'completed' : 'completed_with_errors',
        ], Response::HTTP_CREATED);
    }

    /**
     * @param array<mixed> $mapping
     * @return array<string, string>
     */
    private function sanitizeMapping(array $mapping): array
    {
        $clean = [];
        foreach ($mapping as $colIndex => $fieldName) {
            if (!is_string($fieldName) || !in_array($fieldName, self::ALLOWED_FIELDS, true)) {
                continue;
            }
            $clean[(string) $colIndex] = $fieldName;
        }

        return $clean;
    }

    /**
     * @param array<mixed> $rows
     * @param array<string, string> $mapping
     * @return array{0: list<string>, 1: list<string>}
     */
    private function buildLookupKeys(array $rows, array $mapping, bool $hasPhone, bool $hasEmail): array
    {
        $phones = [];
        $emails = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $mapped = $this->applyMapping($row, $mapping);

            if ($hasPhone) {
                $phone = $this->normalizePhone($mapped['phone'] ?? null);
                if ($phone !== null) {
                    $phones[] = $phone;
                }
            }

            if ($hasEmail) {
                $email = $this->normalizeEmail($mapped['email'] ?? null);
                if ($email !== null) {
                    $emails[] = $email;
                }
            }
        }

        return [array_unique($phones), array_unique($emails)];
    }

    /**
     * @param list<string> $phones
     * @return array<string, true>
     */
    private function fetchExistingByPhone(string $tenantId, array $phones): array
    {
        if ($phones === []) {
            return [];
        }

        $result = [];
        foreach (array_chunk($phones, self::LOOKUP_CHUNK) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $rows = $this->connection->fetchFirstColumn(
                "SELECT phone FROM clients WHERE tenant_id = ? AND deleted_at IS NULL AND phone IN ($placeholders)",
                [$tenantId, ...$chunk],
            );
            foreach ($rows as $phone) {
                $result[(string) $phone] = true;
            }
        }

        return $result;
    }

    /**
     * @param list<string> $emails
     * @return array<string, true>
     */
    private function fetchExistingByEmail(string $tenantId, array $emails): array
    {
        if ($emails === []) {
            return [];
        }

        $result = [];
        foreach (array_chunk($emails, self::LOOKUP_CHUNK) as $chunk) {
            $placeholders = implode(',', array_fill(0, count($chunk), '?'));
            $rows = $this->connection->fetchFirstColumn(
                "SELECT email FROM clients WHERE tenant_id = ? AND deleted_at IS NULL AND email IN ($placeholders)",
                [$tenantId, ...$chunk],
            );
            foreach ($rows as $email) {
                $result[(string) $email] = true;
            }
        }

        return $result;
    }

    /**
     * @param array<mixed> $row
     * @param array<string, string> $mapping
     * @return array<string, mixed>
     */
    private function applyMapping(array $row, array $mapping): array
    {
        $result = [];
        foreach ($mapping as $colIndex => $fieldName) {
            $result[$fieldName] = $row[$colIndex] ?? null;
        }

        return $result;
    }

    private function normalizePhone(mixed $value): ?string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return null;
        }
        $clean = preg_replace('/[^\d+]/', '', (string) $value);

        return ($clean === '' || $clean === '+') ? null : $clean;
    }

    private function normalizeEmail(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $clean = strtolower(trim($value));

        return $clean !== '' && filter_var($clean, \FILTER_VALIDATE_EMAIL) !== false ? $clean : null;
    }

    private function normalizeDate(mixed $value): ?string
    {
        if (!is_string($value) || $value === '') {
            return null;
        }

        try {
            return (new \DateTimeImmutable($value))->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'si', 'sì'], true);
        }

        return (bool) $value;
    }

    /**
     * @param mixed $value
     * @return list<string>
     */
    private function normalizeTags(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value, 'is_string'));
        }
        if (is_string($value) && $value !== '') {
            try {
                $decoded = json_decode($value, true, flags: \JSON_THROW_ON_ERROR);
                if (is_array($decoded)) {
                    return array_values(array_filter($decoded, 'is_string'));
                }
            } catch (\Throwable) {
                // treat as comma-separated
                return array_values(array_filter(array_map('trim', explode(',', $value))));
            }
        }

        return ['imported'];
    }

    private function resolveCurrentUserId(): ?string
    {
        $token = $this->tokenStorage->getToken();
        if ($token === null) {
            return null;
        }

        $user = $token->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $user->getId()->toRfc4122();
    }
}
