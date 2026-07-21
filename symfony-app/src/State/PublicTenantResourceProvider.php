<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\State\ProviderInterface;
use App\Entity\GalleryPhoto;
use App\Entity\Location;
use App\Entity\PortfolioPhoto;
use App\Entity\Product;
use App\Entity\Promotion;
use App\Entity\PromotionProduct;
use App\Entity\PromotionService;
use App\Entity\Service;
use App\Entity\ServiceCategory;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\WebsitePhoto;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @implements ProviderInterface<object>
 */
final class PublicTenantResourceProvider implements ProviderInterface
{
    /**
     * @var array<class-string, array{collection: string, item: string}>
     */
    private const ORDER_BY = [
        Location::class => ['collection' => 'entity.name', 'item' => 'entity.id'],
        Service::class => ['collection' => 'entity.displayOrder, entity.name', 'item' => 'entity.id'],
        ServiceCategory::class => ['collection' => 'entity.displayOrder, entity.name', 'item' => 'entity.id'],
        StaffMember::class => ['collection' => 'entity.createdAt', 'item' => 'entity.id'],
        Product::class => ['collection' => 'entity.name', 'item' => 'entity.id'],
        GalleryPhoto::class => ['collection' => 'entity.displayOrder, entity.createdAt', 'item' => 'entity.id'],
        PortfolioPhoto::class => ['collection' => 'entity.displayOrder, entity.createdAt', 'item' => 'entity.id'],
        WebsitePhoto::class => ['collection' => 'entity.sortOrder, entity.createdAt', 'item' => 'entity.id'],
        Promotion::class => ['collection' => 'entity.displayOrder, entity.validFrom', 'item' => 'entity.id'],
        PromotionProduct::class => ['collection' => 'entity.createdAt', 'item' => 'entity.id'],
        PromotionService::class => ['collection' => 'entity.createdAt', 'item' => 'entity.id'],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $request = $context['request'] ?? null;
        $tenantSlug = $request instanceof Request
            ? $request->attributes->get('slug')
            : ($uriVariables['slug'] ?? null);

        if (!is_string($tenantSlug) || $tenantSlug === '') {
            throw new BadRequestException('Missing public tenant slug.');
        }

        $tenant = $this->em->getRepository(Tenant::class)->findOneBy([
            'slug' => $tenantSlug,
            'status' => 'active',
        ]);

        if (!$tenant instanceof Tenant) {
            throw new NotFoundHttpException('Tenant not found.');
        }

        $this->scopeDoctrineFilterToTenant($tenant);

        $resourceClass = $operation->getClass();
        if ($resourceClass === Tenant::class) {
            return $operation instanceof CollectionOperationInterface ? [$tenant] : $tenant;
        }

        if (!is_string($resourceClass) || !class_exists($resourceClass)) {
            throw new BadRequestException('Unsupported public resource.');
        }

        $id = $request instanceof Request
            ? $request->attributes->get('id')
            : ($uriVariables['id'] ?? null);

        if (is_string($id) && $id !== '') {
            return $this->provideItem($resourceClass, $id);
        }

        return $this->provideCollection($resourceClass);
    }

    private function scopeDoctrineFilterToTenant(Tenant $tenant): void
    {
        $filters = $this->em->getFilters();
        $filter = $filters->isEnabled('tenant_filter')
            ? $filters->getFilter('tenant_filter')
            : $filters->enable('tenant_filter');

        $filter->setParameter('tenant_id', (string) $tenant->getId(), 'uuid');
    }

    /**
     * @param class-string $resourceClass
     */
    private function provideItem(string $resourceClass, string $id): ?object
    {
        $qb = $this->em->createQueryBuilder()
            ->select('entity')
            ->from($resourceClass, 'entity')
            ->andWhere('entity.id = :id')
            ->setParameter('id', $id)
            ->setMaxResults(1);

        $this->applyPublicVisibility($qb, $resourceClass);

        $result = $qb->getQuery()->getOneOrNullResult();
        return is_object($result) ? $result : null;
    }

    /**
     * @param class-string $resourceClass
     *
     * @return list<object>
     */
    private function provideCollection(string $resourceClass): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('entity')
            ->from($resourceClass, 'entity');

        $this->applyPublicVisibility($qb, $resourceClass);

        foreach (explode(',', self::ORDER_BY[$resourceClass]['collection'] ?? 'entity.id') as $orderExpression) {
            $parts = preg_split('/\s+/', trim($orderExpression));
            if ($parts === false || $parts === ['']) {
                continue;
            }

            $qb->addOrderBy($parts[0], $parts[1] ?? 'ASC');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @param class-string $resourceClass
     */
    private function applyPublicVisibility(\Doctrine\ORM\QueryBuilder $qb, string $resourceClass): void
    {
        if (in_array($resourceClass, [Location::class, Service::class, StaffMember::class, Product::class, GalleryPhoto::class], true)) {
            $qb->andWhere('entity.isActive = true');
        }

        if ($resourceClass === StaffMember::class) {
            $qb->andWhere('entity.deletedAt IS NULL');
        }

        if ($resourceClass === PortfolioPhoto::class) {
            $qb->andWhere('entity.isVisible = true');
        }

        if ($resourceClass === Promotion::class) {
            $qb
                ->andWhere('entity.isActive = true')
                ->andWhere('entity.showOnLanding = true')
                ->andWhere('entity.validUntil IS NULL OR entity.validUntil >= :now')
                ->setParameter('now', new \DateTimeImmutable());
        }

        if ($resourceClass === PromotionProduct::class) {
            $qb
                ->join('entity.promotion', 'promotion')
                ->join('entity.product', 'product')
                ->andWhere('promotion.isActive = true')
                ->andWhere('promotion.showOnLanding = true')
                ->andWhere('promotion.validUntil IS NULL OR promotion.validUntil >= :now')
                ->andWhere('product.isActive = true')
                ->setParameter('now', new \DateTimeImmutable());
        }

        if ($resourceClass === PromotionService::class) {
            $qb
                ->join('entity.promotion', 'promotion')
                ->join('entity.service', 'service')
                ->andWhere('promotion.isActive = true')
                ->andWhere('promotion.showOnLanding = true')
                ->andWhere('promotion.validUntil IS NULL OR promotion.validUntil >= :now')
                ->andWhere('service.isActive = true')
                ->setParameter('now', new \DateTimeImmutable());
        }
    }
}
