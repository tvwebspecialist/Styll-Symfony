<?php

declare(strict_types=1);

namespace App\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

/**
 * API Platform filter: ?q=<term> performs case-insensitive OR search
 * across client fullName, phone, and email.
 */
final class ClientSearchFilter extends AbstractFilter
{
    protected function isPropertyMapped(string $property, string $resourceClass, bool $allowAssociation = false): bool
    {
        if ($property === 'q') {
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
        if ($property !== 'q' || !is_string($value) || trim($value) === '') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $paramKey = $queryNameGenerator->generateParameterName('search');

        $queryBuilder
            ->andWhere(
                $queryBuilder->expr()->orX(
                    $queryBuilder->expr()->like("LOWER($alias.fullName)", ":$paramKey"),
                    $queryBuilder->expr()->like("LOWER($alias.email)", ":$paramKey"),
                    $queryBuilder->expr()->like("LOWER($alias.phone)", ":$paramKey"),
                ),
            )
            ->setParameter($paramKey, '%' . strtolower(trim($value)) . '%');
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'q' => [
                'property' => null,
                'type' => 'string',
                'required' => false,
                'description' => 'Case-insensitive search across fullName, phone, and email',
            ],
        ];
    }
}
