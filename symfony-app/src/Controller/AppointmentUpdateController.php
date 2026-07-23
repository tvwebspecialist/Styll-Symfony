<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\Location;
use App\Entity\StaffMember;
use App\Security\TenantContext;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * PATCH /api/appointments/{id}
 *
 * Updates non-status fields of an appointment: startTime/endTime, staffId, locationId, notes.
 * Requires `version` (int) in body for optimistic locking — prevents concurrent overwrites.
 *
 * Returns 409 on:
 *   - Version mismatch (client has stale data): code OPTIMISTIC_LOCK_CONFLICT
 *   - Staff time overlap (DB exclusion constraint 23P01): code OVERLAP_CONFLICT
 *
 * To change status use PATCH /api/appointments/{id}/status.
 * TenantFilter auto-scopes: appointments from other tenants return 404.
 */
#[Route('/api/appointments/{id}', name: 'api_appointment_update', methods: ['PATCH'])]
final class AppointmentUpdateController extends AbstractController
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
            throw $this->createNotFoundException();
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Invalid JSON'], 400);
        }

        if (!array_key_exists('version', $data) || !is_int($data['version'])) {
            return $this->json(['error' => 'version (integer) is required for optimistic locking'], 422);
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

        try {
            $this->em->lock($appointment, LockMode::OPTIMISTIC, $data['version']);
        } catch (OptimisticLockException) {
            return $this->json([
                'error' => 'La versione dell\'appuntamento è cambiata. Ricarica e riprova.',
                'code'  => 'OPTIMISTIC_LOCK_CONFLICT',
            ], 409);
        }

        if (array_key_exists('notes', $data)) {
            $appointment->setNotes($data['notes'] === '' ? null : (string) $data['notes']);
        }

        if (isset($data['startTime']) || isset($data['endTime'])) {
            if (!isset($data['startTime']) || !isset($data['endTime'])) {
                return $this->json(['error' => 'startTime and endTime must be provided together'], 422);
            }
            try {
                $start = new \DateTimeImmutable($data['startTime']);
                $end   = new \DateTimeImmutable($data['endTime']);
            } catch (\Exception) {
                return $this->json(['error' => 'Invalid startTime or endTime format'], 422);
            }
            if ($end <= $start) {
                return $this->json(['error' => 'endTime must be after startTime'], 422);
            }
            $appointment->setStartTime($start)->setEndTime($end);
        }

        if (isset($data['staffId'])) {
            $staff = $this->findInTenant(StaffMember::class, (string) $data['staffId']);
            if ($staff === null) {
                return $this->json(['error' => 'Staff not found in this tenant'], 422);
            }
            $appointment->setStaff($staff);
        }

        if (isset($data['locationId'])) {
            $location = $this->findInTenant(Location::class, (string) $data['locationId']);
            if ($location === null) {
                return $this->json(['error' => 'Location not found in this tenant'], 422);
            }
            $appointment->setLocation($location);
        }

        try {
            $this->em->flush();
        } catch (OptimisticLockException) {
            return $this->json([
                'error' => 'Conflitto di versione concorrente. Ricarica e riprova.',
                'code'  => 'OPTIMISTIC_LOCK_CONFLICT',
            ], 409);
        } catch (\Throwable $e) {
            if ($this->isOverlapViolation($e)) {
                return $this->json([
                    'error' => 'Lo staff ha già un appuntamento in questa fascia oraria.',
                    'code'  => 'OVERLAP_CONFLICT',
                ], 409);
            }
            throw $e;
        }

        return $this->json($this->serializeAppointment($appointment));
    }

    private function findInTenant(string $class, string $id): ?object
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('e')
            ->from($class, 'e')
            ->where('e.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function isOverlapViolation(\Throwable $e): bool
    {
        $current = $e;
        while ($current !== null) {
            $msg = $current->getMessage();
            if (
                str_contains($msg, 'no_overlapping_appointments')
                || str_contains($msg, 'exclusion_violation')
                || str_contains($msg, '23P01')
            ) {
                return true;
            }
            $current = $current->getPrevious();
        }

        return false;
    }

    private function serializeAppointment(Appointment $a): array
    {
        return [
            'id'             => (string) $a->getId(),
            'startTime'      => $a->getStartTime()->format(\DateTimeInterface::ATOM),
            'endTime'        => $a->getEndTime()->format(\DateTimeInterface::ATOM),
            'status'         => $a->getStatus(),
            'bookingSource'  => $a->getBookingSource(),
            'notes'          => $a->getNotes(),
            'clientId'       => $a->getClientId(),
            'clientFullName' => $a->getClientFullName(),
            'staffId'        => $a->getStaffId(),
            'staffFullName'  => $a->getStaffFullName(),
            'locationId'     => $a->getLocationId(),
            'locationName'   => $a->getLocationName(),
            'services'       => $a->getServices(),
            'totalPrice'     => $a->getTotalPrice(),
            'version'        => $a->getVersion(),
            'createdAt'      => $a->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt'      => $a->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
