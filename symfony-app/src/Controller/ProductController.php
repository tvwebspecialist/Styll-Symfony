<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Location;
use App\Entity\Product;
use App\Entity\ProductInventory;
use App\Entity\Tenant;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * CRUD per i prodotti del tenant.
 *
 * Alla creazione di un nuovo prodotto vengono inizializzate automaticamente le righe
 * product_inventory (qty=0, low_stock_threshold=3) per tutte le Location attive del tenant.
 * Questo corrisponde al comportamento di upsertProdotto() in catalogo.ts (Supabase).
 *
 * Nessun soft-delete: cancellazione fisica. Se il prodotto è referenziato da
 * appointment_products → 409 IN_USE.
 */
#[Route('/api/products')]
final class ProductController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', name: 'api_products_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        /** @var Product[] $products */
        $products = $this->em->createQueryBuilder()
            ->select('p', 'inv', 'loc')
            ->from(Product::class, 'p')
            ->leftJoin('p.inventoryEntries', 'inv')
            ->leftJoin('inv.location', 'loc')
            ->orderBy('p.displayOrder', 'ASC')
            ->addOrderBy('p.name', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn (Product $p): array => $this->serialize($p), $products));
    }

    #[Route('', name: 'api_products_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $data = $this->parseJson($request);
        if ($data === null) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        if (empty($data['name'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti', 'fields' => ['name']], 422);
        }
        if (!isset($data['priceSell'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti', 'fields' => ['priceSell']], 422);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $displayOrder = isset($data['displayOrder'])
            ? (int) $data['displayOrder']
            : $this->nextDisplayOrder();

        $product = (new Product())
            ->setTenant($tenant)
            ->setName(trim((string) $data['name']))
            ->setPriceSell((string) $data['priceSell'])
            ->setPriceCost(isset($data['priceCost']) && $data['priceCost'] !== null ? (string) $data['priceCost'] : null)
            ->setBrand(isset($data['brand']) ? (string) $data['brand'] : null)
            ->setDescription(isset($data['description']) ? (string) $data['description'] : null)
            ->setSku(isset($data['sku']) ? (string) $data['sku'] : null)
            ->setPhotoUrl(isset($data['photoUrl']) ? (string) $data['photoUrl'] : null)
            ->setCategory(isset($data['category']) ? (string) $data['category'] : null)
            ->setDisplayOrder($displayOrder)
            ->setIsActive(isset($data['isActive']) ? (bool) $data['isActive'] : true)
            ->setIsNew(isset($data['isNew']) ? (bool) $data['isNew'] : false)
            ->setShowOnSite(isset($data['showOnSite']) ? (bool) $data['showOnSite'] : true);

        $this->em->persist($product);

        // Auto-initialize inventory for each active location at qty=0
        /** @var Location[] $activeLocations */
        $activeLocations = $this->em->createQueryBuilder()
            ->select('l')
            ->from(Location::class, 'l')
            ->where('l.isActive = true')
            ->getQuery()
            ->getResult();

        foreach ($activeLocations as $location) {
            $inv = (new ProductInventory())
                ->setTenant($tenant)
                ->setProduct($product)
                ->setLocation($location)
                ->setQuantity(0)
                ->setLowStockThreshold(3);
            $this->em->persist($inv);
        }

        $this->em->flush();

        // Refresh to populate inventoryEntries collection
        $this->em->refresh($product);

        return $this->json($this->serialize($product), 201);
    }

    #[Route('/{id}', name: 'api_products_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $product = $this->findInTenant($id);
        if ($product === null) {
            return $this->json(['error' => 'Prodotto non trovato'], 404);
        }

        $data = $this->parseJson($request);
        if ($data === null) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        if (isset($data['name'])) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                return $this->json(['error' => 'Il campo name non può essere vuoto'], 422);
            }
            $product->setName($name);
        }

        if (isset($data['priceSell'])) {
            $product->setPriceSell((string) $data['priceSell']);
        }

        if (array_key_exists('priceCost', $data)) {
            $product->setPriceCost($data['priceCost'] !== null ? (string) $data['priceCost'] : null);
        }

        if (array_key_exists('brand', $data)) {
            $product->setBrand($data['brand'] !== null ? (string) $data['brand'] : null);
        }

        if (array_key_exists('description', $data)) {
            $product->setDescription($data['description'] !== null ? (string) $data['description'] : null);
        }

        if (array_key_exists('sku', $data)) {
            $product->setSku($data['sku'] !== null ? (string) $data['sku'] : null);
        }

        if (array_key_exists('photoUrl', $data)) {
            $product->setPhotoUrl($data['photoUrl'] !== null ? (string) $data['photoUrl'] : null);
        }

        if (array_key_exists('category', $data)) {
            $product->setCategory($data['category'] !== null ? (string) $data['category'] : null);
        }

        if (isset($data['displayOrder'])) {
            $product->setDisplayOrder((int) $data['displayOrder']);
        }

        if (isset($data['isActive'])) {
            $product->setIsActive((bool) $data['isActive']);
        }

        if (isset($data['isNew'])) {
            $product->setIsNew((bool) $data['isNew']);
        }

        if (isset($data['showOnSite'])) {
            $product->setShowOnSite((bool) $data['showOnSite']);
        }

        $this->em->flush();

        return $this->json($this->serialize($product));
    }

    #[Route('/{id}', name: 'api_products_delete', methods: ['DELETE'])]
    public function delete(string $id): Response
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $product = $this->findInTenant($id);
        if ($product === null) {
            return $this->json(['error' => 'Prodotto non trovato'], 404);
        }

        try {
            $this->em->remove($product);
            $this->em->flush();
        } catch (\Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException) {
            return $this->json([
                'error' => 'Prodotto in uso in appuntamenti esistenti — disattivarlo invece di cancellarlo',
                'code'  => 'IN_USE',
            ], 409);
        }

        return new Response(null, 204);
    }

    private function findInTenant(string $id): ?Product
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('p')
            ->from(Product::class, 'p')
            ->where('p.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function nextDisplayOrder(): int
    {
        $max = $this->em->createQuery(
            'SELECT MAX(p.displayOrder) FROM App\Entity\Product p',
        )->getSingleScalarResult();

        return $max === null ? 0 : (int) $max + 1;
    }

    /** @return array<string, mixed>|null */
    private function parseJson(Request $request): ?array
    {
        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);

            return $data;
        } catch (\JsonException) {
            return null;
        }
    }

    /** @return array<string, mixed> */
    private function serialize(Product $p): array
    {
        $inventoryEntries = $p->getInventoryEntries()->toArray();

        $totalStock = array_sum(array_map(
            fn (ProductInventory $inv): int => $inv->getQuantity(),
            $inventoryEntries,
        ));

        $isLowStock = false;
        foreach ($inventoryEntries as $inv) {
            if ($inv->getQuantity() <= $inv->getLowStockThreshold()) {
                $isLowStock = true;
                break;
            }
        }

        $inventory = array_map(fn (ProductInventory $inv): array => [
            'id'                => (string) $inv->getId(),
            'locationId'        => (string) $inv->getLocation()->getId(),
            'locationName'      => $inv->getLocation()->getName(),
            'quantity'          => $inv->getQuantity(),
            'lowStockThreshold' => $inv->getLowStockThreshold(),
            'isLowStock'        => $inv->getQuantity() <= $inv->getLowStockThreshold(),
        ], $inventoryEntries);

        return [
            'id'           => (string) $p->getId(),
            'name'         => $p->getName(),
            'brand'        => $p->getBrand(),
            'description'  => $p->getDescription(),
            'priceSell'    => $p->getPriceSell(),
            'priceCost'    => $p->getPriceCost(),
            'sku'          => $p->getSku(),
            'photoUrl'     => $p->getPhotoUrl(),
            'category'     => $p->getCategory(),
            'displayOrder' => $p->getDisplayOrder(),
            'isActive'     => $p->isActive(),
            'isNew'        => $p->isNew(),
            'showOnSite'   => $p->isShowOnSite(),
            'totalStock'   => $totalStock,
            'isLowStock'   => $isLowStock,
            'inventory'    => $inventory,
            'createdAt'    => $p->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt'    => $p->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
