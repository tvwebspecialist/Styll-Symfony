<?php

declare(strict_types=1);

namespace App\Controller;

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
 * CRUD per le categorie di servizi del tenant.
 *
 * Nessun soft-delete: la cancellazione fisica imposta category_id=NULL
 * sui servizi figli (ON DELETE SET NULL — definito a schema DB).
 */
#[Route('/api/service-categories')]
final class ServiceCategoryController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', name: 'api_service_categories_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $categories = $this->em->createQueryBuilder()
            ->select('c')
            ->from(ServiceCategory::class, 'c')
            ->orderBy('c.displayOrder', 'ASC')
            ->addOrderBy('c.name', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn (ServiceCategory $c): array => $this->serialize($c), $categories));
    }

    #[Route('', name: 'api_service_categories_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $data = $this->parseJson($request);
        if ($data === null) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['error' => 'Il campo name è obbligatorio'], 422);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $displayOrder = isset($data['displayOrder']) ? (int) $data['displayOrder'] : $this->nextDisplayOrder();

        $category = (new ServiceCategory())
            ->setTenant($tenant)
            ->setName($name)
            ->setDisplayOrder($displayOrder);

        $this->em->persist($category);

        try {
            $this->em->flush();
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException) {
            return $this->json(['error' => 'Esiste già una categoria con questo nome', 'code' => 'DUPLICATE_NAME'], 409);
        }

        return $this->json($this->serialize($category), 201);
    }

    #[Route('/{id}', name: 'api_service_categories_update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $category = $this->findInTenant($id);
        if ($category === null) {
            return $this->json(['error' => 'Categoria non trovata'], 404);
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
            $category->setName($name);
        }

        if (isset($data['displayOrder'])) {
            $category->setDisplayOrder((int) $data['displayOrder']);
        }

        try {
            $this->em->flush();
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException) {
            return $this->json(['error' => 'Esiste già una categoria con questo nome', 'code' => 'DUPLICATE_NAME'], 409);
        }

        return $this->json($this->serialize($category));
    }

    #[Route('/{id}', name: 'api_service_categories_delete', methods: ['DELETE'])]
    public function delete(string $id): Response
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $category = $this->findInTenant($id);
        if ($category === null) {
            return $this->json(['error' => 'Categoria non trovata'], 404);
        }

        $this->em->remove($category);
        $this->em->flush();

        return new Response(null, 204);
    }

    private function findInTenant(string $id): ?ServiceCategory
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
            'SELECT MAX(c.displayOrder) FROM App\Entity\ServiceCategory c',
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
    private function serialize(ServiceCategory $c): array
    {
        return [
            'id'           => (string) $c->getId(),
            'name'         => $c->getName(),
            'displayOrder' => $c->getDisplayOrder(),
            'createdAt'    => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
