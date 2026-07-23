<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Service;
use App\Entity\ServiceCategory;
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
 * CRUD per i servizi del tenant.
 *
 * Nessun soft-delete: i servizi senza appuntamenti vengono cancellati fisicamente.
 * Se il servizio è referenziato da appointment_services (FK NOT NULL senza CASCADE),
 * il DB rifiuta la cancellazione → 409 IN_USE.
 * Per i servizi ancora attivi ma da non mostrare: usare PATCH con is_active=false.
 */
#[Route('/api/services')]
final class ServiceController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', name: 'api_services_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $qb = $this->em->createQueryBuilder()
            ->select('s', 'sc')
            ->from(Service::class, 's')
            ->leftJoin('s.serviceCategory', 'sc')
            ->orderBy('s.displayOrder', 'ASC')
            ->addOrderBy('s.name', 'ASC');

        if ($request->query->get('active') === '1') {
            $qb->andWhere('s.isActive = true');
        }

        /** @var Service[] $services */
        $services = $qb->getQuery()->getResult();

        return $this->json(array_map(fn (Service $s): array => $this->serialize($s), $services));
    }

    #[Route('', name: 'api_services_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $data = $this->parseJson($request);
        if ($data === null) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        $missing = [];
        if (empty($data['name'])) {
            $missing[] = 'name';
        }
        if (!isset($data['price'])) {
            $missing[] = 'price';
        }
        if (!isset($data['durationMinutes'])) {
            $missing[] = 'durationMinutes';
        }
        if ($missing !== []) {
            return $this->json(['error' => 'Campi obbligatori mancanti', 'fields' => $missing], 422);
        }

        $durationMinutes = (int) $data['durationMinutes'];
        if ($durationMinutes <= 0) {
            return $this->json(['error' => 'durationMinutes deve essere > 0'], 422);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $displayOrder = isset($data['displayOrder'])
            ? (int) $data['displayOrder']
            : $this->nextDisplayOrder();

        $serviceCategory = null;
        if (!empty($data['serviceCategoryId'])) {
            $serviceCategory = $this->findCategory((string) $data['serviceCategoryId']);
            if ($serviceCategory === null) {
                return $this->json(['error' => 'Categoria non trovata in questo tenant'], 422);
            }
        }

        $service = (new Service())
            ->setTenant($tenant)
            ->setName(trim((string) $data['name']))
            ->setPrice((string) $data['price'])
            ->setDurationMinutes($durationMinutes)
            ->setDisplayOrder($displayOrder)
            ->setDescription(isset($data['description']) ? (string) $data['description'] : null)
            ->setCategory(isset($data['category']) ? (string) $data['category'] : null)
            ->setServiceCategory($serviceCategory)
            ->setIsActive(isset($data['isActive']) ? (bool) $data['isActive'] : true)
            ->setShowOnWebsite(isset($data['showOnWebsite']) ? (bool) $data['showOnWebsite'] : true);

        $this->em->persist($service);
        $this->em->flush();

        return $this->json($this->serialize($service), 201);
    }

    #[Route('/{id}', name: 'api_services_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $service = $this->findInTenant($id);
        if ($service === null) {
            return $this->json(['error' => 'Servizio non trovato'], 404);
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
            $service->setName($name);
        }

        if (isset($data['price'])) {
            $service->setPrice((string) $data['price']);
        }

        if (isset($data['durationMinutes'])) {
            $durationMinutes = (int) $data['durationMinutes'];
            if ($durationMinutes <= 0) {
                return $this->json(['error' => 'durationMinutes deve essere > 0'], 422);
            }
            $service->setDurationMinutes($durationMinutes);
        }

        if (array_key_exists('description', $data)) {
            $service->setDescription($data['description'] !== null ? (string) $data['description'] : null);
        }

        if (array_key_exists('category', $data)) {
            $service->setCategory($data['category'] !== null ? (string) $data['category'] : null);
        }

        if (array_key_exists('serviceCategoryId', $data)) {
            if ($data['serviceCategoryId'] === null) {
                $service->setServiceCategory(null);
            } else {
                $serviceCategory = $this->findCategory((string) $data['serviceCategoryId']);
                if ($serviceCategory === null) {
                    return $this->json(['error' => 'Categoria non trovata in questo tenant'], 422);
                }
                $service->setServiceCategory($serviceCategory);
            }
        }

        if (isset($data['displayOrder'])) {
            $service->setDisplayOrder((int) $data['displayOrder']);
        }

        if (isset($data['isActive'])) {
            $service->setIsActive((bool) $data['isActive']);
        }

        if (isset($data['showOnWebsite'])) {
            $service->setShowOnWebsite((bool) $data['showOnWebsite']);
        }

        $this->em->flush();

        return $this->json($this->serialize($service));
    }

    #[Route('/{id}', name: 'api_services_delete', methods: ['DELETE'])]
    public function delete(string $id): Response
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $service = $this->findInTenant($id);
        if ($service === null) {
            return $this->json(['error' => 'Servizio non trovato'], 404);
        }

        try {
            $this->em->remove($service);
            $this->em->flush();
        } catch (\Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException) {
            return $this->json([
                'error' => 'Servizio in uso in appuntamenti esistenti — disattivarlo invece di cancellarlo',
                'code'  => 'IN_USE',
            ], 409);
        }

        return new Response(null, 204);
    }

    private function findInTenant(string $id): ?Service
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('s')
            ->from(Service::class, 's')
            ->where('s.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function findCategory(string $id): ?ServiceCategory
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('c')
            ->from(ServiceCategory::class, 'c')
            ->where('c.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function nextDisplayOrder(): int
    {
        $max = $this->em->createQuery(
            'SELECT MAX(s.displayOrder) FROM App\Entity\Service s',
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
    private function serialize(Service $s): array
    {
        $cat = $s->getServiceCategory();

        return [
            'id'                => (string) $s->getId(),
            'name'              => $s->getName(),
            'description'       => $s->getDescription(),
            'price'             => (string) $s->getPrice(),
            'durationMinutes'   => $s->getDurationMinutes(),
            'category'          => $s->getCategory(),
            'serviceCategoryId' => $cat !== null ? (string) $cat->getId() : null,
            'categoryName'      => $cat !== null ? $cat->getName() : null,
            'displayOrder'      => $s->getDisplayOrder(),
            'isActive'          => $s->isActive(),
            'showOnWebsite'     => $s->isShowOnWebsite(),
            'createdAt'         => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt'         => $s->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
