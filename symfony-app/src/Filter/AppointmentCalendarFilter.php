<?php

declare(strict_types=1);

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\Uid\Uuid;

/**
 * Calendar filter for appointments:
 *   ?from=YYYY-MM-DD  → startTime >= date (inclusive)
 *   ?to=YYYY-MM-DD    → startTime < date (exclusive)
 *   ?staffId=UUID     → filter by staff member UUID
 *   ?status=confirmed → filter by appointment status
 */
final class AppointmentCalendarFilter extends AbstractFilter
{
    protected function isPropertyMapped(string $property, string $resourceClass, bool $allowAssociation = false): bool
    {
        if (in_array($property, ['from', 'to', 'staffId', 'status'], true)) {
            return true;
        }

        return parent::isPropertyMapped($property, $resourceClass, $allowAssociation);
    }

    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        $alias = $queryBuilder->getRootAliases()[0];

        if ($property === 'from' && is_string($value) && $value !== '') {
            $param = $queryNameGenerator->generateParameterName('from');
            $queryBuilder
                ->andWhere("$alias.startTime >= :$param")
                ->setParameter($param, new \DateTimeImmutable($value . 'T00:00:00Z'));
        }

        if ($property === 'to' && is_string($value) && $value !== '') {
            $param = $queryNameGenerator->generateParameterName('to');
            $queryBuilder
                ->andWhere("$alias.startTime < :$param")
                ->setParameter($param, new \DateTimeImmutable($value . 'T00:00:00Z'));
        }

        if ($property === 'staffId' && is_string($value) && $value !== '' && Uuid::isValid($value)) {
            $param = $queryNameGenerator->generateParameterName('staffId');
            $queryBuilder
                ->andWhere("$alias.staff = :$param")
                ->setParameter($param, Uuid::fromString($value));
        }

        if ($property === 'status' && is_string($value) && $value !== '') {
            $param = $queryNameGenerator->generateParameterName('status');
            $queryBuilder
                ->andWhere("$alias.status = :$param")
                ->setParameter($param, $value);
        }
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'from' => [
                'property' => null,
                'type' => 'string',
                'required' => false,
                'description' => 'Inclusive start date filter (YYYY-MM-DD UTC)',
            ],
            'to' => [
                'property' => null,
                'type' => 'string',
                'required' => false,
                'description' => 'Exclusive end date filter (YYYY-MM-DD UTC)',
            ],
            'staffId' => [
                'property' => null,
                'type' => 'string',
                'required' => false,
                'description' => 'Filter by staff member UUID',
            ],
            'status' => [
                'property' => null,
                'type' => 'string',
                'required' => false,
                'description' => 'Filter by appointment status (pending|confirmed|completed|cancelled|no_show)',
            ],
        ];
    }
}
