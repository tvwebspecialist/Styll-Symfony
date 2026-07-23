<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\SiteAnalyticsDaily;
use App\Repository\SiteAnalyticsDailyRepository;
use App\Repository\TenantActivityLogRepository;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;

final class AdminAnalyticsService
{
    private const VALID_PERIODS = [7, 30, 90];

    public function __construct(
        private readonly Connection $connection,
        private readonly SiteAnalyticsDailyRepository $siteAnalyticsDailyRepository,
        private readonly TenantActivityLogRepository $tenantActivityLogRepository,
    ) {}

    /**
     * @return array{
     *     summary: array{
     *         total_sessions: int,
     *         avg_conversion_rate: float,
     *         top_tenant: array{name: string, slug: string, sessions: int}|null,
     *         at_risk_count: int,
     *         prev_total_sessions: int,
     *         prev_avg_conversion_rate: float,
     *         mobile_sessions: int,
     *         desktop_sessions: int,
     *         median_sessions: float,
     *         at_risk_threshold: float
     *     },
     *     daily: list<array{date: string, sessions: int, page_views: int, booking_completed: int}>,
     *     tenants: list<array{
     *         tenant_id: string,
     *         business_name: string,
     *         slug: string,
     *         sessions: int,
     *         page_views: int,
     *         booking_completed: int,
     *         avg_conversion_rate: float,
     *         days_with_data: int,
     *         last_login_at: string|null
     *     }>,
     *     period_days: int,
     *     insight_text: string
     * }
     */
    public function getPlatformAnalytics(int $periodDays): array
    {
        $periodDays = $this->normalizePeriodDays($periodDays);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $currentSince = $this->isoDate($now->modify(sprintf('-%d days', $periodDays)));
        $currentUntil = $this->isoDate($now);
        $prevSince = $this->isoDate($now->modify(sprintf('-%d days', $periodDays * 2)));

        $currentRows = $this->siteAnalyticsDailyRepository->fetchNormalizedRows(
            since: $currentSince,
            until: $currentUntil,
        );
        $previousRows = $this->siteAnalyticsDailyRepository->fetchNormalizedRows(
            since: $prevSince,
            until: $currentSince,
        );

        $tenantIds = array_values(array_unique(array_map(
            static fn (array $row): string => (string) $row['tenant_id'],
            $currentRows,
        )));

        $tenantIndex = $this->loadTenantIndex($tenantIds);
        $activityByTenant = $this->tenantActivityLogRepository->findLatestLastLoginByTenantIds($tenantIds);

        $tenantAggregates = [];
        $dailyAggregates = [];

        foreach ($currentRows as $row) {
            $tenantId = (string) $row['tenant_id'];
            $date = (string) $row['date'];

            $tenantAggregate = $tenantAggregates[$tenantId] ?? [
                'sessions' => 0,
                'page_views' => 0,
                'booking_completed' => 0,
                'conversion_sum' => 0.0,
                'mobile' => 0,
                'desktop' => 0,
                'days' => 0,
            ];

            $tenantAggregate['sessions'] += (int) $row['sessions'];
            $tenantAggregate['page_views'] += (int) $row['page_views'];
            $tenantAggregate['booking_completed'] += (int) $row['booking_completed'];
            $tenantAggregate['conversion_sum'] += (float) $row['conversion_rate'];
            $tenantAggregate['mobile'] += (int) $row['mobile_sessions'];
            $tenantAggregate['desktop'] += (int) $row['desktop_sessions'];
            $tenantAggregate['days'] += 1;
            $tenantAggregates[$tenantId] = $tenantAggregate;

            $dailyAggregate = $dailyAggregates[$date] ?? [
                'sessions' => 0,
                'page_views' => 0,
                'booking_completed' => 0,
            ];

            $dailyAggregate['sessions'] += (int) $row['sessions'];
            $dailyAggregate['page_views'] += (int) $row['page_views'];
            $dailyAggregate['booking_completed'] += (int) $row['booking_completed'];
            $dailyAggregates[$date] = $dailyAggregate;
        }

        $tenants = [];
        foreach ($tenantAggregates as $tenantId => $aggregate) {
            if (!isset($tenantIndex[$tenantId])) {
                continue;
            }

            $tenant = $tenantIndex[$tenantId];
            $days = max(1, (int) $aggregate['days']);

            $tenants[] = [
                'tenant_id' => $tenantId,
                'business_name' => $tenant['business_name'],
                'slug' => $tenant['slug'],
                'sessions' => (int) $aggregate['sessions'],
                'page_views' => (int) $aggregate['page_views'],
                'booking_completed' => (int) $aggregate['booking_completed'],
                'avg_conversion_rate' => (float) $aggregate['conversion_sum'] / $days,
                'days_with_data' => (int) $aggregate['days'],
                'last_login_at' => $activityByTenant[$tenantId] ?? null,
            ];
        }

        usort($tenants, static fn (array $left, array $right): int => $right['sessions'] <=> $left['sessions']);

        ksort($dailyAggregates);
        $daily = [];
        foreach ($dailyAggregates as $date => $aggregate) {
            $daily[] = [
                'date' => $date,
                'sessions' => (int) $aggregate['sessions'],
                'page_views' => (int) $aggregate['page_views'],
                'booking_completed' => (int) $aggregate['booking_completed'],
            ];
        }

        $totalSessions = array_sum(array_map(static fn (array $row): int => $row['sessions'], $tenants));
        $totalMobile = array_sum(array_map(static fn (array $row): int => (int) $row['mobile'], $tenantAggregates));
        $totalDesktop = array_sum(array_map(static fn (array $row): int => (int) $row['desktop'], $tenantAggregates));
        $conversionRates = array_map(static fn (array $row): float => (float) $row['avg_conversion_rate'], $tenants);
        $avgConversionRate = $conversionRates === []
            ? 0.0
            : array_sum($conversionRates) / count($conversionRates);
        $topTenant = $tenants[0] ?? null;

        $sessionValues = array_map(static fn (array $row): int => $row['sessions'], $tenants);
        $medianSessions = $this->median($sessionValues);
        $atRiskThreshold = min($avgConversionRate * 0.5, 0.03);
        $atRiskCount = count(array_filter($tenants, static function (array $row) use ($medianSessions, $atRiskThreshold): bool {
            return $row['sessions'] > $medianSessions && $row['avg_conversion_rate'] < $atRiskThreshold;
        }));

        $previousTotalSessions = 0;
        $previousConversionSum = 0.0;
        $previousConversionCount = 0;
        foreach ($previousRows as $row) {
            $previousTotalSessions += (int) $row['sessions'];
            $previousConversionSum += (float) $row['conversion_rate'];
            ++$previousConversionCount;
        }

        $previousAvgConversionRate = $previousConversionCount > 0
            ? $previousConversionSum / $previousConversionCount
            : 0.0;

        return [
            'summary' => [
                'total_sessions' => $totalSessions,
                'avg_conversion_rate' => $avgConversionRate,
                'top_tenant' => $topTenant === null ? null : [
                    'name' => $topTenant['business_name'],
                    'slug' => $topTenant['slug'],
                    'sessions' => $topTenant['sessions'],
                ],
                'at_risk_count' => $atRiskCount,
                'prev_total_sessions' => $previousTotalSessions,
                'prev_avg_conversion_rate' => $previousAvgConversionRate,
                'mobile_sessions' => $totalMobile,
                'desktop_sessions' => $totalDesktop,
                'median_sessions' => $medianSessions,
                'at_risk_threshold' => $atRiskThreshold,
            ],
            'daily' => $daily,
            'tenants' => $tenants,
            'period_days' => $periodDays,
            'insight_text' => $this->buildInsightText(
                $totalSessions,
                $previousTotalSessions,
                $avgConversionRate,
                $previousAvgConversionRate,
                $atRiskCount,
            ),
        ];
    }

    /**
     * @return array{
     *     tenant_name: string,
     *     tenant_slug: string,
     *     period: int,
     *     website_daily: list<array<string, int|float|string>>,
     *     pwa_daily: list<array<string, int|float|string>>,
     *     last_login_at: string|null,
     *     appointments_in_period: int
     * }|null
     */
    public function getTenantAnalytics(string $tenantId, int $periodDays): ?array
    {
        $tenant = $this->connection->fetchAssociative(
            'SELECT id, business_name, slug FROM tenants WHERE id = :id',
            ['id' => $tenantId],
        );

        if ($tenant === false) {
            return null;
        }

        $periodDays = $this->normalizePeriodDays($periodDays);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $since = $this->isoDate($now->modify(sprintf('-%d days', $periodDays)));

        $websiteDaily = $this->siteAnalyticsDailyRepository->fetchNormalizedRows(
            tenantId: $tenantId,
            surface: SiteAnalyticsDaily::SURFACE_WEBSITE,
            since: $since,
        );
        $pwaDaily = $this->siteAnalyticsDailyRepository->fetchNormalizedRows(
            tenantId: $tenantId,
            surface: SiteAnalyticsDaily::SURFACE_PWA,
            since: $since,
        );

        $appointmentsInPeriod = (int) $this->connection->fetchOne(
            <<<'SQL'
                SELECT COUNT(*)
                FROM appointments
                WHERE tenant_id = :tenant_id
                  AND created_at >= :since
                  AND deleted_at IS NULL
            SQL,
            [
                'tenant_id' => $tenantId,
                'since' => $since.'T00:00:00+00:00',
            ],
        );

        return [
            'tenant_name' => (string) $tenant['business_name'],
            'tenant_slug' => (string) $tenant['slug'],
            'period' => $periodDays,
            'website_daily' => $websiteDaily,
            'pwa_daily' => $pwaDaily,
            'last_login_at' => $this->tenantActivityLogRepository->findLatestLastLoginForTenant($tenantId),
            'appointments_in_period' => $appointmentsInPeriod,
        ];
    }

    private function normalizePeriodDays(int $periodDays): int
    {
        return in_array($periodDays, self::VALID_PERIODS, true) ? $periodDays : 30;
    }

    private function isoDate(\DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d');
    }

    /**
     * @param list<string> $tenantIds
     *
     * @return array<string, array{business_name: string, slug: string}>
     */
    private function loadTenantIndex(array $tenantIds): array
    {
        if ($tenantIds === []) {
            return [];
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, business_name, slug FROM tenants WHERE id IN (:ids)',
            ['ids' => $tenantIds],
            ['ids' => ArrayParameterType::STRING],
        );

        $result = [];
        foreach ($rows as $row) {
            $result[(string) $row['id']] = [
                'business_name' => (string) $row['business_name'],
                'slug' => (string) $row['slug'],
            ];
        }

        return $result;
    }

    /**
     * @param list<int> $values
     */
    private function median(array $values): float
    {
        if ($values === []) {
            return 0.0;
        }

        sort($values);
        $middle = intdiv(count($values), 2);

        if (count($values) % 2 === 0) {
            return ($values[$middle - 1] + $values[$middle]) / 2;
        }

        return (float) $values[$middle];
    }

    private function pctChange(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return null;
        }

        return ((float) $current - (float) $previous) / (float) $previous;
    }

    private function buildInsightText(
        int $totalSessions,
        int $previousTotalSessions,
        float $avgConversionRate,
        float $previousAvgConversionRate,
        int $atRiskCount,
    ): string {
        if ($totalSessions === 0) {
            return 'Nessun dato disponibile per il periodo selezionato.';
        }

        $parts = [];
        $sessionChange = $this->pctChange($totalSessions, $previousTotalSessions);
        $conversionChange = $this->pctChange($avgConversionRate, $previousAvgConversionRate);

        if ($sessionChange !== null) {
            $parts[] = sprintf(
                'Le visite sono %s del %s%s rispetto al periodo precedente.',
                $sessionChange >= 0 ? 'cresciute' : 'calate',
                $sessionChange >= 0 ? '+' : '',
                number_format($sessionChange * 100, 1, '.', ''),
            );
        }

        if ($conversionChange !== null && abs($conversionChange) > 0.001) {
            $parts[] = sprintf(
                'La conversione media e %s del %s%s.',
                $conversionChange >= 0 ? 'salita' : 'scesa',
                $conversionChange >= 0 ? '+' : '',
                number_format($conversionChange * 100, 1, '.', ''),
            );
        }

        if ($atRiskCount > 0) {
            $parts[] = sprintf(
                '%d tenant %s traffico elevato ma bassa conversione - contattali per supporto o upsell.',
                $atRiskCount,
                $atRiskCount === 1 ? 'ha' : 'hanno',
            );
        }

        if ($parts !== []) {
            return implode(' ', $parts);
        }

        return sprintf('%s visite totali nel periodo.', number_format($totalSessions, 0, ',', '.'));
    }
}
