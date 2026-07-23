<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SiteAnalyticsDaily;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

final class SiteAnalyticsDailyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SiteAnalyticsDaily::class);
    }

    /**
     * @return list<array{
     *     tenant_id: string,
     *     date: string,
     *     app_surface: string,
     *     sessions: int,
     *     page_views: int,
     *     unique_visitors: int,
     *     booking_started: int,
     *     booking_completed: int,
     *     conversion_rate: float,
     *     new_signups: int,
     *     logins: int,
     *     mobile_sessions: int,
     *     desktop_sessions: int
     * }>
     */
    public function fetchNormalizedRows(
        ?string $tenantId = null,
        ?string $surface = null,
        ?string $since = null,
        ?string $until = null,
    ): array {
        $sql = <<<'SQL'
            SELECT
                tenant_id,
                date,
                app_surface,
                sessions,
                page_views,
                unique_visitors,
                booking_started_count,
                booking_completed_count,
                signup_count,
                conversion_rate,
                device_breakdown
            FROM site_analytics_daily
            WHERE 1 = 1
        SQL;

        $params = [];
        $types = [];

        if ($tenantId !== null) {
            $sql .= ' AND tenant_id = :tenant_id';
            $params['tenant_id'] = $tenantId;
        }

        if ($surface !== null) {
            $sql .= ' AND app_surface = :app_surface';
            $params['app_surface'] = $surface;
        }

        if ($since !== null) {
            $sql .= ' AND date >= :since';
            $params['since'] = $since;
        }

        if ($until !== null) {
            $sql .= ' AND date < :until';
            $params['until'] = $until;
        }

        $sql .= ' ORDER BY date ASC';

        $rows = $this->getEntityManager()->getConnection()->fetchAllAssociative($sql, $params, $types);

        return array_map(function (array $row): array {
            $deviceBreakdown = $this->decodeJsonValue($row['device_breakdown'] ?? null);
            $normalizedBreakdown = $this->normalizeDeviceBreakdown($deviceBreakdown);

            return [
                'tenant_id' => (string) $row['tenant_id'],
                'date' => $this->normalizeDateValue($row['date'] ?? null),
                'app_surface' => (string) $row['app_surface'],
                'sessions' => $this->toInt($row['sessions'] ?? 0),
                'page_views' => $this->toInt($row['page_views'] ?? 0),
                'unique_visitors' => $this->toInt($row['unique_visitors'] ?? 0),
                'booking_started' => $this->toInt($row['booking_started_count'] ?? 0),
                'booking_completed' => $this->toInt($row['booking_completed_count'] ?? 0),
                'conversion_rate' => $this->toFloat($row['conversion_rate'] ?? 0),
                'new_signups' => $this->toInt($row['signup_count'] ?? 0),
                'logins' => 0,
                'mobile_sessions' => $normalizedBreakdown['mobile_sessions'],
                'desktop_sessions' => $normalizedBreakdown['desktop_sessions'],
            ];
        }, $rows);
    }

    private function normalizeDateValue(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return substr((string) $value, 0, 10);
    }

    private function toInt(mixed $value): int
    {
        return (int) $value;
    }

    private function toFloat(mixed $value): float
    {
        return (float) $value;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function decodeJsonValue(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || $value === '') {
            return [];
        }

        try {
            $decoded = json_decode($value, true, flags: \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return [];
        }

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<array-key, mixed> $value
     *
     * @return array{mobile_sessions: int, desktop_sessions: int}
     */
    private function normalizeDeviceBreakdown(array $value): array
    {
        $mobileSessions = 0;
        $desktopSessions = 0;

        foreach ($value as $key => $rawValue) {
            if (is_int($key) && is_array($rawValue)) {
                $label = strtolower((string) ($rawValue['device'] ?? $rawValue['type'] ?? $rawValue['label'] ?? $rawValue['name'] ?? ''));
                $count = $this->readCount($rawValue);

                if (str_contains($label, 'mobile')) {
                    $mobileSessions += $count;
                }

                if (str_contains($label, 'desktop')) {
                    $desktopSessions += $count;
                }

                continue;
            }

            $normalizedKey = strtolower((string) $key);
            $count = $this->readCount($rawValue);

            if (str_contains($normalizedKey, 'mobile')) {
                $mobileSessions += $count;
            }

            if (str_contains($normalizedKey, 'desktop')) {
                $desktopSessions += $count;
            }
        }

        return [
            'mobile_sessions' => $mobileSessions,
            'desktop_sessions' => $desktopSessions,
        ];
    }

    private function readCount(mixed $value): int
    {
        if (is_int($value) || is_float($value) || is_string($value)) {
            return (int) $value;
        }

        if (!is_array($value)) {
            return 0;
        }

        foreach (['count', 'sessions', 'value'] as $key) {
            if (array_key_exists($key, $value)) {
                return (int) $value[$key];
            }
        }

        return 0;
    }
}
