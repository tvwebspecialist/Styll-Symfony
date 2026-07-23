<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * DELETE /api/appointments/{id}
 *
 * Soft-deletes an appointment: sets deleted_at to now, leaves the row in DB.
 * AppointmentSoftDeleteExtension hides it from GET/GetCollection after this.
 *
 * Returns 204 on success. 404 if not found in current tenant or already soft-deleted.
 * TenantFilter auto-scopes: appointments from other tenants return 404.
 */
#[Route('/api/appointments/{id}', name: 'api_appointment_delete', methods: ['DELETE'])]
final class AppointmentDeleteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(string $id): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            throw $this->createNotFoundException();
        }

        /** @var Appointment|null $appointment */
        $appointment = $this->em->createQueryBuilder()
            ->select('a')
            ->from(Appointment::class, 'a')
            ->where('a.id = :id')
            ->andWhere('a.deletedAt IS NULL')
            ->setParameter('id', Uuid::fromString($id))
            ->getQuery()
            ->getOneOrNullResult();

        if ($appointment === null) {
            throw $this->createNotFoundException('Appuntamento non trovato.');
        }

        $appointment->setDeletedAt(new \DateTimeImmutable());
        $this->em->flush();

        return $this->json(null, 204);
    }
}
