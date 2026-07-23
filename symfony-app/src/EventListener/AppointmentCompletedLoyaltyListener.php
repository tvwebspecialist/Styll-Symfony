<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Appointment;
use App\Entity\ClientLoyalty;
use App\Entity\LoyaltyConfig;
use App\Entity\LoyaltyTransaction;
use App\Event\AppointmentStatusChangedEvent;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\Uid\Uuid;

/**
 * Assegna punti fedeltà quando un appuntamento viene completato (solo template classic v1).
 *
 * Non deve MAI far fallire il cambio di stato: qualsiasi eccezione viene catturata,
 * loggata e inghiottita. Il flush dell'appointment è già avvenuto prima del dispatch.
 *
 * Idempotenza: idx_loyalty_one_earn_per_appt (partial unique index su appointment_id
 * WHERE type='earn') impedisce doppie assegnazioni a livello DB. UniqueConstraintViolationException
 * viene catturata silenziosamente.
 */
#[AsEventListener]
final class AppointmentCompletedLoyaltyListener
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    public function __invoke(AppointmentStatusChangedEvent $event): void
    {
        if ($event->newStatus !== Appointment::STATUS_COMPLETED) {
            return;
        }

        try {
            $this->processLoyalty($event->appointmentId, $event->tenantId);
        } catch (\Throwable $e) {
            $this->em->clear();
            $this->logger->error('[loyalty] Errore assegnazione punti su completamento appuntamento', [
                'appointmentId' => $event->appointmentId,
                'tenantId'      => $event->tenantId,
                'error'         => $e->getMessage(),
                'class'         => $e::class,
            ]);
        }
    }

    private function processLoyalty(string $appointmentId, string $tenantId): void
    {
        /** @var Appointment|null $appointment */
        $appointment = $this->em->find(Appointment::class, Uuid::fromString($appointmentId));
        if ($appointment === null) {
            $this->logger->warning('[loyalty] Appuntamento {id} non trovato per assegnazione punti', [
                'id' => $appointmentId,
            ]);

            return;
        }

        /** @var LoyaltyConfig|null $config */
        $config = $this->em->createQueryBuilder()
            ->select('c')
            ->from(LoyaltyConfig::class, 'c')
            ->where('c.endedAt IS NULL')
            ->andWhere('c.isActive = :active')
            ->setParameter('active', true)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($config === null) {
            return;
        }

        if ($config->getTemplate() !== LoyaltyConfig::TEMPLATE_CLASSIC) {
            $this->logger->info('[loyalty] Template {tpl} non supportato in v1 — punti non assegnati', [
                'tpl'           => $config->getTemplate(),
                'appointmentId' => $appointmentId,
            ]);

            return;
        }

        $pointsEarned = $config->getPointsPerVisit() ?? 100;
        if ($pointsEarned <= 0) {
            return;
        }

        $client = $appointment->getClient();
        $staff  = $appointment->getStaff();
        $tenant = $config->getTenant();

        /** @var ClientLoyalty|null $loyalty */
        $loyalty = $this->em->createQueryBuilder()
            ->select('l')
            ->from(ClientLoyalty::class, 'l')
            ->where('l.client = :client')
            ->andWhere('l.tenant = :tenant')
            ->setParameter('client', $client)
            ->setParameter('tenant', $tenant)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($loyalty === null) {
            $loyalty = (new ClientLoyalty())
                ->setTenant($tenant)
                ->setClient($client);
            $this->em->persist($loyalty);
        }

        $loyalty->setTotalPoints($loyalty->getTotalPoints() + $pointsEarned);
        $loyalty->setAvailablePoints($loyalty->getAvailablePoints() + $pointsEarned);
        $loyalty->setLastVisitDate(new \DateTimeImmutable('today'));

        $transaction = (new LoyaltyTransaction())
            ->setTenant($tenant)
            ->setClient($client)
            ->setType(LoyaltyTransaction::TYPE_EARN)
            ->setPoints($pointsEarned)
            ->setDescription('Visita completata')
            ->setAppointment($appointment)
            ->setStaff($staff)
            ->setLoyaltyConfigVersion($config->getVersion());

        $this->em->persist($transaction);

        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            // idx_loyalty_one_earn_per_appt: già assegnati per questo appuntamento
            $this->em->clear();
            $this->logger->info('[loyalty] Punti già assegnati per appuntamento {id} — idempotente', [
                'id' => $appointmentId,
            ]);
        }
    }
}
