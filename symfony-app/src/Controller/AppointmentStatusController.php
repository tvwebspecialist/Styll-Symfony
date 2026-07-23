<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Event\AppointmentStatusChangedEvent;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * PATCH /api/appointments/{id}/status
 *
 * Changes appointment status following the allowed transition matrix:
 *
 *   pending   → confirmed, cancelled
 *   confirmed → completed, cancelled, no_show
 *   completed → cancelled  (administrative correction)
 *   no_show   → confirmed, cancelled
 *   cancelled → (none — terminal state)
 *
 * Returns 422 for invalid transitions.
 * Dispatches AppointmentStatusChangedEvent after every successful transition.
 * Loyalty point assignment, notifications, and inventory are handled by future listeners.
 */
#[Route('/api/appointments/{id}/status', name: 'api_appointment_status', methods: ['PATCH'])]
final class AppointmentStatusController extends AbstractController
{
    private const TRANSITIONS = [
        Appointment::STATUS_PENDING   => [Appointment::STATUS_CONFIRMED, Appointment::STATUS_CANCELLED],
        Appointment::STATUS_CONFIRMED => [Appointment::STATUS_COMPLETED, Appointment::STATUS_CANCELLED, Appointment::STATUS_NO_SHOW],
        Appointment::STATUS_COMPLETED => [Appointment::STATUS_CANCELLED],
        Appointment::STATUS_NO_SHOW   => [Appointment::STATUS_CONFIRMED, Appointment::STATUS_CANCELLED],
        Appointment::STATUS_CANCELLED => [],
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
        private readonly EventDispatcherInterface $eventDispatcher,
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

        if (empty($data['status'])) {
            return $this->json(['error' => 'status is required'], 422);
        }

        $newStatus = (string) $data['status'];

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

        $currentStatus = $appointment->getStatus();
        $allowed = self::TRANSITIONS[$currentStatus] ?? [];

        if (!in_array($newStatus, $allowed, true)) {
            return $this->json([
                'error' => sprintf(
                    'Transizione non consentita: %s → %s. Transizioni valide: [%s]',
                    $currentStatus,
                    $newStatus,
                    $allowed !== [] ? implode(', ', $allowed) : 'nessuna — stato terminale',
                ),
                'code'  => 'INVALID_TRANSITION',
            ], 422);
        }

        if (array_key_exists('notes', $data)) {
            $appointment->setNotes($data['notes'] === '' ? null : (string) $data['notes']);
        }

        $appointment->setStatus($newStatus);
        $this->em->flush();

        $this->eventDispatcher->dispatch(new AppointmentStatusChangedEvent(
            appointmentId:  (string) $appointment->getId(),
            tenantId:       (string) $appointment->getTenant()->getId(),
            previousStatus: $currentStatus,
            newStatus:      $newStatus,
            occurredAt:     new \DateTimeImmutable(),
        ));

        return $this->json([
            'id'        => (string) $appointment->getId(),
            'status'    => $appointment->getStatus(),
            'notes'     => $appointment->getNotes(),
            'version'   => $appointment->getVersion(),
            'updatedAt' => $appointment->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }
}
