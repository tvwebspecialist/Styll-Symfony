<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\Service;
use App\Entity\StaffMember;
use App\Entity\WorkingHour;
use App\Entity\WorkingHourOverride;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Slot availability calculator — ports booking-slots.ts logic.
 *
 * GET /api/availability/slots
 *   ?staffId=UUID           (required)
 *   ?date=YYYY-MM-DD        (required, local date in target timezone)
 *   ?serviceId=UUID         (optional — resolves duration_minutes from Service)
 *   ?serviceDuration=int    (optional — explicit duration in minutes; used when no serviceId)
 *   ?timezone=Europe/Rome   (optional — defaults to Europe/Rome)
 *   ?excludeAppointmentId=UUID (optional — exclude this appointment from busy windows)
 *
 * Response: { slots: [{time: "HH:MM", available: bool}], isWorkingDay: bool, reason?: string }
 *
 * Slot grid: every 30 minutes (matching SLOT_STEP_MINUTES in booking-slots.ts).
 * Past dates: returns { slots: [], isWorkingDay: true } (same as TS behaviour).
 */
#[Route('/api/availability/slots', name: 'api_availability_slots', methods: ['GET'])]
final class AvailabilitySlotsController extends AbstractController
{
    private const SLOT_STEP_MINUTES = 30;
    private const DEFAULT_TIMEZONE = 'Europe/Rome';
    private const DEFAULT_DURATION_MINUTES = 30;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $tenantId = $this->tenantContext->getTenantId();
        if ($tenantId === null) {
            throw $this->createAccessDeniedException();
        }

        $staffIdParam = $request->query->get('staffId', '');
        $date         = $request->query->get('date', '');
        $timezone     = $request->query->get('timezone', self::DEFAULT_TIMEZONE);
        $excludeId    = $request->query->get('excludeAppointmentId', '');

        if (!is_string($staffIdParam) || $staffIdParam === '' || !Uuid::isValid($staffIdParam)) {
            return $this->json(['error' => 'staffId is required and must be a valid UUID'], 400);
        }
        if (!is_string($date) || $date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $this->json(['error' => 'date is required (YYYY-MM-DD)'], 400);
        }
        if (!is_string($timezone)) {
            $timezone = self::DEFAULT_TIMEZONE;
        }
        try {
            $tz = new \DateTimeZone($timezone);
        } catch (\Exception) {
            $tz = new \DateTimeZone(self::DEFAULT_TIMEZONE);
        }

        // Verify staff belongs to current tenant
        $staffUuid = Uuid::fromString($staffIdParam);
        $staff = $this->em->createQueryBuilder()
            ->select('s')
            ->from(StaffMember::class, 's')
            ->where('s.id = :staffId')
            ->andWhere('s.tenant = :tenantId')
            ->andWhere('s.isActive = true')
            ->andWhere('s.deletedAt IS NULL')
            ->setParameter('staffId', $staffUuid)
            ->setParameter('tenantId', $tenantId)
            ->getQuery()
            ->getOneOrNullResult();

        if ($staff === null) {
            throw $this->createNotFoundException('Staff member not found.');
        }

        // Past date check (same as TS: date < today in target timezone → skip)
        $nowLocal = (new \DateTimeImmutable('now', $tz));
        $today = $nowLocal->format('Y-m-d');
        if ($date < $today) {
            return $this->json(['slots' => [], 'isWorkingDay' => true]);
        }

        // Resolve service duration
        $duration = $this->resolveServiceDuration($request, $tenantId);

        // Fetch override for this staff + date
        $override = $this->em->createQueryBuilder()
            ->select('o')
            ->from(WorkingHourOverride::class, 'o')
            ->where('o.tenant = :tenantId')
            ->andWhere('o.staff = :staffId')
            ->andWhere('o.date = :date')
            ->setParameter('tenantId', $tenantId)
            ->setParameter('staffId', $staffUuid)
            ->setParameter('date', new \DateTimeImmutable($date), \Doctrine\DBAL\Types\Types::DATE_IMMUTABLE)
            ->getQuery()
            ->getOneOrNullResult();

        /** @var WorkingHourOverride|null $override */
        if ($override !== null && $override->isClosed()) {
            return $this->json([
                'slots' => [],
                'isWorkingDay' => false,
                'reason' => $override->getReason() ?? 'Chiuso',
            ]);
        }

        // Determine working windows
        $workingWindows = [];
        if ($override !== null && $override->getStartTime() !== null && $override->getEndTime() !== null) {
            $workingWindows = [[
                'start' => $this->timeToMinutes($override->getStartTime()),
                'end'   => $this->timeToMinutes($override->getEndTime()),
            ]];
        } else {
            $dayOfWeek = (int) (new \DateTimeImmutable($date . 'T12:00:00Z'))->format('w');
            /** @var WorkingHour[] $whs */
            $whs = $this->em->createQueryBuilder()
                ->select('wh')
                ->from(WorkingHour::class, 'wh')
                ->where('wh.tenant = :tenantId')
                ->andWhere('wh.staff = :staffId')
                ->andWhere('wh.dayOfWeek = :dow')
                ->orderBy('wh.startTime', 'ASC')
                ->setParameter('tenantId', $tenantId)
                ->setParameter('staffId', $staffUuid)
                ->setParameter('dow', $dayOfWeek)
                ->getQuery()
                ->getResult();

            foreach ($whs as $wh) {
                $workingWindows[] = [
                    'start' => $this->timeToMinutes($wh->getStartTime()),
                    'end'   => $this->timeToMinutes($wh->getEndTime()),
                ];
            }
        }

        if (empty($workingWindows)) {
            return $this->json(['slots' => [], 'isWorkingDay' => false, 'reason' => 'Giorno di riposo']);
        }

        // UTC range for this local date (for appointments query)
        $utcTz        = new \DateTimeZone('UTC');
        $dayStartLocal = new \DateTimeImmutable($date . 'T00:00:00', $tz);
        $dayEndLocal   = $dayStartLocal->modify('+1 day');
        $utcStart      = $dayStartLocal->setTimezone($utcTz);
        $utcEnd        = $dayEndLocal->setTimezone($utcTz);

        // Fetch existing appointments for this staff on this local date
        $apptQb = $this->em->createQueryBuilder()
            ->select('a.startTime, a.endTime')
            ->from(Appointment::class, 'a')
            ->where('a.tenant = :tenantId')
            ->andWhere('a.staff = :staffId')
            ->andWhere('a.deletedAt IS NULL')
            ->andWhere('a.status NOT IN (:excludeStatuses)')
            ->andWhere('a.startTime >= :dayStart')
            ->andWhere('a.startTime < :dayEnd')
            ->setParameter('tenantId', $tenantId)
            ->setParameter('staffId', $staffUuid)
            ->setParameter('excludeStatuses', [Appointment::STATUS_CANCELLED, Appointment::STATUS_NO_SHOW])
            ->setParameter('dayStart', $utcStart)
            ->setParameter('dayEnd', $utcEnd);

        if (is_string($excludeId) && $excludeId !== '' && Uuid::isValid($excludeId)) {
            $apptQb->andWhere('a.id != :excludeId')
                ->setParameter('excludeId', Uuid::fromString($excludeId));
        }

        $rawAppointments = $apptQb->getQuery()->getResult();

        // Convert appointments to local-time minute windows
        $busyWindows = array_map(function (array $row) use ($tz): array {
            $start = $this->utcToLocalMinutes($row['startTime'], $tz);
            $end   = $this->utcToLocalMinutes($row['endTime'], $tz);
            return ['start' => $start, 'end' => $end];
        }, $rawAppointments);

        // For today: minimum slot start = now + SLOT_STEP_MINUTES buffer
        $minSlotStart = ($date === $today)
            ? (int) $nowLocal->format('G') * 60 + (int) $nowLocal->format('i') + self::SLOT_STEP_MINUTES
            : 0;

        // Generate slots across all working windows
        $slots = [];
        foreach ($workingWindows as $window) {
            $startMin = $window['start'];
            $endMin   = $window['end'];

            for ($slotStart = $startMin; $slotStart + $duration <= $endMin; $slotStart += self::SLOT_STEP_MINUTES) {
                if ($slotStart < $minSlotStart) {
                    continue;
                }
                $slotEnd     = $slotStart + $duration;
                $hasConflict = false;
                foreach ($busyWindows as $busy) {
                    if ($slotStart < $busy['end'] && $slotEnd > $busy['start']) {
                        $hasConflict = true;
                        break;
                    }
                }
                $slots[] = ['time' => $this->minutesToTime($slotStart), 'available' => !$hasConflict];
            }
        }

        return $this->json(['slots' => $slots, 'isWorkingDay' => true]);
    }

    private function resolveServiceDuration(Request $request, Uuid $tenantId): int
    {
        $serviceIdParam = $request->query->get('serviceId', '');
        if (is_string($serviceIdParam) && $serviceIdParam !== '' && Uuid::isValid($serviceIdParam)) {
            $service = $this->em->createQueryBuilder()
                ->select('s.durationMinutes')
                ->from(Service::class, 's')
                ->where('s.id = :serviceId')
                ->andWhere('s.tenant = :tenantId')
                ->andWhere('s.isActive = true')
                ->setParameter('serviceId', Uuid::fromString($serviceIdParam))
                ->setParameter('tenantId', $tenantId)
                ->getQuery()
                ->getOneOrNullResult();

            if ($service !== null && isset($service['durationMinutes'])) {
                return max(self::SLOT_STEP_MINUTES, (int) $service['durationMinutes']);
            }
        }

        $explicit = $request->query->getInt('serviceDuration', 0);
        if ($explicit > 0) {
            return $explicit;
        }

        return self::DEFAULT_DURATION_MINUTES;
    }

    private function timeToMinutes(\DateTimeImmutable $time): int
    {
        return (int) $time->format('G') * 60 + (int) $time->format('i');
    }

    private function utcToLocalMinutes(\DateTimeImmutable $utcTime, \DateTimeZone $tz): int
    {
        $local = $utcTime->setTimezone($tz);
        return (int) $local->format('G') * 60 + (int) $local->format('i');
    }

    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
