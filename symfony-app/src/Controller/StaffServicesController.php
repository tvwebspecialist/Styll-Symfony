<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Service;
use App\Entity\StaffMember;
use App\Entity\StaffService;
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
 * Gestione delle competenze (servizi erogabili) di uno staff member.
 *
 * GET    /api/staff-members/{staffId}/services         → lista
 * POST   /api/staff-members/{staffId}/services         → assegna (idempotente se già presente)
 * DELETE /api/staff-members/{staffId}/services/{id}    → rimuove
 */
#[Route('/api/staff-members/{staffId}/services')]
final class StaffServicesController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', name: 'api_staff_services_list', methods: ['GET'])]
    public function list(string $staffId): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $staff = $this->findStaff($staffId);
        if ($staff === null) {
            return $this->json(['error' => 'Staff member non trovato'], 404);
        }

        /** @var StaffService[] $assignments */
        $assignments = $this->em->createQueryBuilder()
            ->select('ss', 's')
            ->from(StaffService::class, 'ss')
            ->join('ss.service', 's')
            ->where('ss.staff = :staff')
            ->setParameter('staff', $staff)
            ->orderBy('s.name', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn (StaffService $ss): array => [
            'id'        => (string) $ss->getId(),
            'serviceId' => (string) $ss->getService()->getId(),
            'name'      => $ss->getService()->getName(),
            'price'     => $ss->getService()->getPrice(),
            'isActive'  => $ss->getService()->isActive(),
        ], $assignments));
    }

    #[Route('', name: 'api_staff_services_assign', methods: ['POST'])]
    public function assign(string $staffId, Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $staff = $this->findStaff($staffId);
        if ($staff === null) {
            return $this->json(['error' => 'Staff member non trovato'], 404);
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        $serviceIdRaw = (string) ($data['serviceId'] ?? '');
        if (!Uuid::isValid($serviceIdRaw)) {
            return $this->json(['error' => 'serviceId non valido'], 422);
        }

        /** @var Service|null $service */
        $service = $this->em->createQueryBuilder()
            ->select('s')
            ->from(Service::class, 's')
            ->where('s.id = :id')
            ->setParameter('id', Uuid::fromString($serviceIdRaw))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($service === null) {
            return $this->json(['error' => 'Servizio non trovato in questo tenant'], 422);
        }

        // Idempotent: se già assegnato, ritorna 200
        /** @var StaffService|null $existing */
        $existing = $this->em->createQueryBuilder()
            ->select('ss')
            ->from(StaffService::class, 'ss')
            ->where('ss.staff = :staff')
            ->andWhere('ss.service = :service')
            ->setParameter('staff', $staff)
            ->setParameter('service', $service)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($existing !== null) {
            return $this->json([
                'id'        => (string) $existing->getId(),
                'serviceId' => (string) $service->getId(),
                'name'      => $service->getName(),
            ]);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $staffService = (new StaffService())
            ->setTenant($tenant)
            ->setStaff($staff)
            ->setService($service);

        $this->em->persist($staffService);
        $this->em->flush();

        return $this->json([
            'id'        => (string) $staffService->getId(),
            'serviceId' => (string) $service->getId(),
            'name'      => $service->getName(),
        ], 201);
    }

    #[Route('/{id}', name: 'api_staff_services_remove', methods: ['DELETE'])]
    public function remove(string $staffId, string $id): Response
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        $staff = $this->findStaff($staffId);
        if ($staff === null) {
            return $this->json(['error' => 'Staff member non trovato'], 404);
        }

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'ID assegnazione non valido'], 404);
        }

        /** @var StaffService|null $staffService */
        $staffService = $this->em->createQueryBuilder()
            ->select('ss')
            ->from(StaffService::class, 'ss')
            ->where('ss.id = :id')
            ->andWhere('ss.staff = :staff')
            ->setParameter('id', Uuid::fromString($id))
            ->setParameter('staff', $staff)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($staffService === null) {
            return $this->json(['error' => 'Assegnazione non trovata'], 404);
        }

        $this->em->remove($staffService);
        $this->em->flush();

        return new Response(null, 204);
    }

    private function findStaff(string $staffId): ?StaffMember
    {
        if (!Uuid::isValid($staffId)) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('sm')
            ->from(StaffMember::class, 'sm')
            ->where('sm.id = :id')
            ->andWhere('sm.isActive = true')
            ->andWhere('sm.deletedAt IS NULL')
            ->setParameter('id', Uuid::fromString($staffId))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
