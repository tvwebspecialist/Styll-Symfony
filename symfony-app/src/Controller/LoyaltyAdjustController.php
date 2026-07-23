<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Entity\LoyaltyTransaction;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * POST /api/clients/{id}/loyalty/adjust
 *
 * Aggiustamento manuale dei punti fedeltà (walk-in, correzioni).
 *  - points > 0 → type='bonus', aggiorna total_points + available_points
 *  - points < 0 → type='adjustment', aggiorna solo available_points (total rimane lifetime)
 *  - Blocca se available_points + delta < 0
 *  - Crea ClientLoyalty se non esiste
 */
#[Route('/api/clients/{id}/loyalty/adjust', name: 'api_loyalty_adjust', methods: ['POST'])]
final class LoyaltyAdjustController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(Request $request, string $id): JsonResponse
    {
        if ($this->tenantContext->getTenantId() === null) {
            throw $this->createAccessDeniedException();
        }

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'ID cliente non valido'], 422);
        }

        /** @var Client|null $client */
        $client = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Client::class, 'c')
            ->where('c.id = :id')
            ->setParameter('id', Uuid::fromString($id))
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($client === null) {
            return $this->json(['error' => 'Cliente non trovato'], 422);
        }

        try {
            /** @var array<string, mixed> $data */
            $data = json_decode($request->getContent(), true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'JSON non valido'], 400);
        }

        if (!isset($data['points']) || !is_int($data['points']) || $data['points'] === 0) {
            return $this->json(['error' => 'Il campo points è obbligatorio e deve essere un intero diverso da zero'], 422);
        }

        $delta       = $data['points'];
        $description = isset($data['description']) ? (string) $data['description'] : null;

        /** @var Tenant $tenant */
        $tenant = $this->em->find(Tenant::class, $this->tenantContext->getTenantId());

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

        $newAvailable = $loyalty->getAvailablePoints() + $delta;
        if ($newAvailable < 0) {
            return $this->json([
                'error'           => 'Punti disponibili insufficienti per questa detrazione',
                'availablePoints' => $loyalty->getAvailablePoints(),
                'requested'       => $delta,
            ], 422);
        }

        if ($delta > 0) {
            $loyalty->setTotalPoints($loyalty->getTotalPoints() + $delta);
        }
        $loyalty->setAvailablePoints($newAvailable);

        $type = $delta > 0 ? LoyaltyTransaction::TYPE_BONUS : LoyaltyTransaction::TYPE_ADJUSTMENT;

        $transaction = (new LoyaltyTransaction())
            ->setTenant($tenant)
            ->setClient($client)
            ->setType($type)
            ->setPoints($delta)
            ->setDescription($description)
            ->setStaff($this->resolveCurrentStaffMember());

        $this->em->persist($transaction);
        $this->em->flush();

        return $this->json([
            'totalPoints'     => $loyalty->getTotalPoints(),
            'availablePoints' => $loyalty->getAvailablePoints(),
            'transactionId'   => (string) $transaction->getId(),
            'type'            => $type,
            'points'          => $delta,
        ], 201);
    }

    private function resolveCurrentStaffMember(): ?StaffMember
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $this->em->createQueryBuilder()
            ->select('sm')
            ->from(StaffMember::class, 'sm')
            ->join('sm.profile', 'p')
            ->where('p.id = :userId')
            ->andWhere('sm.isActive = true')
            ->andWhere('sm.deletedAt IS NULL')
            ->setParameter('userId', $user->getId())
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
