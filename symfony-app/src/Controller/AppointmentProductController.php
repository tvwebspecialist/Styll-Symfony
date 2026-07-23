<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\AppointmentProduct;
use App\Entity\Product;
use App\Entity\Tenant;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * POST /api/appointments/{id}/products
 *
 * Registra la vendita/utilizzo di un prodotto durante un appuntamento.
 *  - price_at_sale = snapshot di product.price_sell al momento della vendita
 *  - Il decremento di product_inventory è demandato al trigger DB trg_decrement_inventory
 *    (AFTER INSERT on appointment_products) — NON viene eseguito codice PHP per il decremento.
 *  - Il trigger usa appointment.location_id per determinare quale riga di product_inventory decrementare.
 *  - Se non esiste una riga product_inventory per quella location, il trigger non decrementa
 *    (UPDATE con 0 righe colpite) senza errore.
 *
 * Non è previsto un endpoint di rimozione in questa fase (storno prodotto è v2).
 */
#[Route('/api/appointments/{id}/products', name: 'api_appointment_products_add', methods: ['POST'])]
final class AppointmentProductController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'ID appuntamento non valido'], 422);
        }

        /** @var Appointment|null $appointment */
        $appointment = $this->em->createQueryBuilder()
            ->select('a')
            ->from(Appointment::class, 'a')
            ->where('a.id = :id')
            ->andWhere('a.deletedAt IS NULL')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($appointment === null) {
            return $this->json(['error' => 'Appuntamento non trovato'], 404);
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        $productIdRaw = (string) ($data['productId'] ?? '');
        if (!Uuid::isValid($productIdRaw)) {
            return $this->json(['error' => 'productId non valido'], 422);
        }

        $quantity = isset($data['quantity']) ? (int) $data['quantity'] : 1;
        if ($quantity <= 0) {
            return $this->json(['error' => 'La quantità deve essere almeno 1'], 422);
        }

        /** @var Product|null $product */
        $product = $this->em->createQueryBuilder()
            ->select('p')
            ->from(Product::class, 'p')
            ->where('p.id = :id')
            ->andWhere('p.isActive = true')
            ->setParameter('id', Uuid::fromString($productIdRaw))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($product === null) {
            return $this->json([
                'error' => 'Prodotto non trovato, non attivo, o non appartiene a questo tenant',
                'code'  => 'PRODUCT_NOT_AVAILABLE',
            ], 422);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $apptProduct = (new AppointmentProduct())
            ->setTenant($tenant)
            ->setAppointment($appointment)
            ->setProduct($product)
            ->setQuantity($quantity)
            ->setPriceAtSale($product->getPriceSell()); // snapshot prezzo corrente

        $this->em->persist($apptProduct);
        $this->em->flush();
        // NOTA: trg_decrement_inventory si esegue automaticamente nell'AFTER INSERT
        // e decrementa product_inventory per la location dell'appuntamento.

        return $this->json([
            'id'            => (string) $apptProduct->getId(),
            'appointmentId' => (string) $appointment->getId(),
            'productId'     => (string) $product->getId(),
            'productName'   => $product->getName(),
            'quantity'      => $apptProduct->getQuantity(),
            'priceAtSale'   => $apptProduct->getPriceAtSale(),
            'createdAt'     => $apptProduct->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], 201);
    }
}
