<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ProductInventory;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Gestione giacenza prodotti per sede.
 *
 * GET  /api/product-inventory          → lista giacenze (filtrabili per sede)
 * PATCH /api/product-inventory/{id}    → rettifica manuale quantità / soglia alert
 *
 * Il decremento automatico (vendita in appuntamento) è delegato al trigger DB
 * trg_decrement_inventory — questo endpoint serve solo per rettifiche manuali
 * dopo conteggi fisici.
 *
 * La colonna isLowStock è calcolata in risposta: quantity <= low_stock_threshold.
 */
#[Route('/api/product-inventory')]
final class ProductInventoryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', name: 'api_product_inventory_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $qb = $this->em->createQueryBuilder()
            ->select('inv', 'p', 'loc')
            ->from(ProductInventory::class, 'inv')
            ->join('inv.product', 'p')
            ->join('inv.location', 'loc')
            ->orderBy('p.name', 'ASC')
            ->addOrderBy('loc.name', 'ASC');

        $locationId = $request->query->get('locationId');
        if (is_string($locationId) && Uuid::isValid($locationId)) {
            $qb->andWhere('loc.id = :locationId')
               ->setParameter('locationId', Uuid::fromString($locationId));
        }

        /** @var ProductInventory[] $entries */
        $entries = $qb->getQuery()->getResult();

        return $this->json(array_map(fn (ProductInventory $inv): array => $this->serialize($inv), $entries));
    }

    #[Route('/{id}', name: 'api_product_inventory_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'ID non valido'], 404);
        }

        /** @var ProductInventory|null $inv */
        $inv = $this->em->createQueryBuilder()
            ->select('inv')
            ->from(ProductInventory::class, 'inv')
            ->where('inv.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($inv === null) {
            return $this->json(['error' => 'Giacenza non trovata'], 404);
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        if (isset($data['quantity'])) {
            $qty = (int) $data['quantity'];
            if ($qty < 0) {
                return $this->json(['error' => 'La quantità non può essere negativa'], 422);
            }
            $inv->setQuantity($qty);
        }

        if (isset($data['lowStockThreshold'])) {
            $threshold = (int) $data['lowStockThreshold'];
            if ($threshold < 0) {
                return $this->json(['error' => 'La soglia di allerta non può essere negativa'], 422);
            }
            $inv->setLowStockThreshold($threshold);
        }

        $this->em->flush();

        return $this->json($this->serialize($inv));
    }

    /** @return array<string, mixed> */
    private function serialize(ProductInventory $inv): array
    {
        return [
            'id'                => (string) $inv->getId(),
            'productId'         => (string) $inv->getProduct()->getId(),
            'productName'       => $inv->getProduct()->getName(),
            'locationId'        => (string) $inv->getLocation()->getId(),
            'locationName'      => $inv->getLocation()->getName(),
            'quantity'          => $inv->getQuantity(),
            'lowStockThreshold' => $inv->getLowStockThreshold(),
            'isLowStock'        => $inv->getQuantity() <= $inv->getLowStockThreshold(),
            'updatedAt'         => $inv->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
