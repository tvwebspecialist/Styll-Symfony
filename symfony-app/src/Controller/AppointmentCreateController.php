<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\AppointmentService;
use App\Entity\Client;
use App\Entity\Location;
use App\Entity\Service;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * POST /api/appointments
 *
 * Creates a new appointment for the current tenant.
 * - Validates all referenced entities belong to the current tenant (TenantFilter auto-applies).
 * - Creates AppointmentService rows with price_at_booking snapshot.
 * - Returns 409 if the DB exclusion constraint fires (staff overlap, PostgreSQL error 23P01).
 *
 * Booking confirmation token is NOT set here (dashboard-created appointments don't need it).
 * Status defaults to 'confirmed'. bookingSource defaults to 'dashboard_owner'.
 */
#[Route('/api/appointments', name: 'api_appointment_create', methods: ['POST'])]
final class AppointmentCreateController extends AbstractController
{
    private const CREATABLE_STATUSES = [
        Appointment::STATUS_PENDING,
        Appointment::STATUS_CONFIRMED,
    ];

    private const VALID_SOURCES = [
        Appointment::SOURCE_DASHBOARD_OWNER,
        Appointment::SOURCE_DASHBOARD_MANAGER,
        Appointment::SOURCE_DASHBOARD_STAFF,
        Appointment::SOURCE_DASHBOARD_RECEPTIONIST,
        Appointment::SOURCE_WALK_IN,
        Appointment::SOURCE_PHONE,
        Appointment::SOURCE_WHATSAPP,
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Invalid JSON'], 400);
        }

        $missing = [];
        foreach (['clientId', 'staffId', 'locationId', 'startTime', 'endTime'] as $field) {
            if (empty($data[$field])) {
                $missing[] = $field;
            }
        }
        if ($missing !== []) {
            return $this->json(['error' => 'Missing required fields', 'fields' => $missing], 422);
        }

        try {
            $startTime = new \DateTimeImmutable($data['startTime']);
            $endTime   = new \DateTimeImmutable($data['endTime']);
        } catch (\Exception) {
            return $this->json(['error' => 'Invalid startTime or endTime format'], 422);
        }

        if ($endTime <= $startTime) {
            return $this->json(['error' => 'endTime must be after startTime'], 422);
        }

        $status = $data['status'] ?? Appointment::STATUS_CONFIRMED;
        if (!in_array($status, self::CREATABLE_STATUSES, true)) {
            return $this->json(['error' => 'status must be pending or confirmed for new appointments'], 422);
        }

        $source = $data['bookingSource'] ?? Appointment::SOURCE_DASHBOARD_OWNER;
        if (!in_array($source, self::VALID_SOURCES, true)) {
            return $this->json(['error' => 'Invalid bookingSource'], 422);
        }

        $client   = $this->findInTenant(Client::class, (string) ($data['clientId'] ?? ''));
        $staff    = $this->findInTenant(StaffMember::class, (string) ($data['staffId'] ?? ''));
        $location = $this->findInTenant(Location::class, (string) ($data['locationId'] ?? ''));

        if ($client === null) {
            return $this->json(['error' => 'Client not found in this tenant'], 422);
        }
        if ($staff === null) {
            return $this->json(['error' => 'Staff not found in this tenant'], 422);
        }
        if ($location === null) {
            return $this->json(['error' => 'Location not found in this tenant'], 422);
        }

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

        $appointment = (new Appointment())
            ->setTenant($tenant)
            ->setClient($client)
            ->setStaff($staff)
            ->setLocation($location)
            ->setStartTime($startTime)
            ->setEndTime($endTime)
            ->setStatus($status)
            ->setBookingSource($source)
            ->setNotes($data['notes'] ?? null);

        $this->em->persist($appointment);

        $serviceIds = $data['serviceIds'] ?? [];
        if (is_array($serviceIds)) {
            foreach ($serviceIds as $serviceId) {
                if (!Uuid::isValid((string) $serviceId)) {
                    return $this->json(['error' => "Invalid serviceId: $serviceId"], 422);
                }
                $service = $this->findInTenant(Service::class, (string) $serviceId);
                if ($service === null) {
                    return $this->json(['error' => "Service $serviceId not found in this tenant"], 422);
                }
                $apptSvc = (new AppointmentService())
                    ->setTenant($tenant)
                    ->setAppointment($appointment)
                    ->setService($service)
                    ->setPriceAtBooking($service->getPrice());

                $this->em->persist($apptSvc);
            }
        }

        try {
            $this->em->flush();
        } catch (\Throwable $e) {
            if ($this->isOverlapViolation($e)) {
                return $this->json([
                    'error' => 'Lo staff ha già un appuntamento in questa fascia oraria.',
                    'code'  => 'OVERLAP_CONFLICT',
                ], 409);
            }
            throw $e;
        }

        // Refresh to populate the appointmentServices collection from DB.
        $this->em->refresh($appointment);

        return $this->json($this->serializeAppointment($appointment), 201);
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
