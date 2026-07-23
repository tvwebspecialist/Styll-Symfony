<?php

declare(strict_types=1);

namespace App\Event;

/**
 * Fired after an appointment's status changes successfully.
 * Extension point for loyalty point assignment, notifications, inventory, etc.
 * No listeners are registered in Fase 2a — connect them in subsequent tasks.
 */
final readonly class AppointmentStatusChangedEvent
{
    public function __construct(
        public string $appointmentId,
        public string $tenantId,
        public string $previousStatus,
        public string $newStatus,
        public \DateTimeImmutable $occurredAt,
    ) {}
}
