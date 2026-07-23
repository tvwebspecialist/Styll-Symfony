<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Entity\LoyaltyTransaction;
use App\Entity\Reward;
use App\Entity\RewardRedemption;
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
 * POST /api/clients/{id}/reward-redemptions
 *
 * Riscatto immediato lato barber (barberRedeemForClient).
 *  - Valida reward attiva nel tenant
 *  - Verifica available_points >= points_cost
 *  - Transazionale: decrementa available_points, crea RewardRedemption (confirmed_at=now),
 *    crea LoyaltyTransaction type='redeem' con punti negativi
 *  - total_points NON decrementato (è un contatore lifetime delle earn)
 */
#[Route('/api/clients/{id}/reward-redemptions', name: 'api_reward_redemption_create', methods: ['POST'])]
final class RewardRedemptionCreateController extends AbstractController
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

        $rewardIdRaw = (string) ($data['rewardId'] ?? '');
        if (!Uuid::isValid($rewardIdRaw)) {
            return $this->json(['error' => 'rewardId non valido'], 422);
        }

        /** @var Reward|null $reward */
        $reward = $this->em->createQueryBuilder()
            ->select('r')
            ->from(Reward::class, 'r')
            ->where('r.id = :id')
            ->andWhere('r.isActive = :active')
            ->setParameter('id', Uuid::fromString($rewardIdRaw))
            ->setParameter('active', true)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($reward === null) {
            return $this->json(['error' => 'Reward non trovata o non attiva in questo tenant'], 422);
        }

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
            return $this->json([
                'error' => 'Il cliente non è iscritto al programma fedeltà',
                'code'  => 'NOT_ENROLLED',
            ], 422);
        }

        $cost = $reward->getPointsCost();
        if ($loyalty->getAvailablePoints() < $cost) {
            return $this->json([
                'error'           => 'Punti disponibili insufficienti per riscattare questa reward',
                'code'            => 'INSUFFICIENT_POINTS',
                'availablePoints' => $loyalty->getAvailablePoints(),
                'required'        => $cost,
            ], 422);
        }

        $loyalty->setAvailablePoints($loyalty->getAvailablePoints() - $cost);

        $currentStaff = $this->resolveCurrentStaffMember();

        $redemption = (new RewardRedemption())
            ->setTenant($tenant)
            ->setClient($client)
            ->setReward($reward)
            ->setPointsSpent($cost)
            ->setConfirmedBy($currentStaff)
            ->setConfirmedAt(new \DateTimeImmutable());

        $transaction = (new LoyaltyTransaction())
            ->setTenant($tenant)
            ->setClient($client)
            ->setType(LoyaltyTransaction::TYPE_REDEEM)
            ->setPoints(-$cost)
            ->setDescription('Riscatto: '.$reward->getName())
            ->setStaff($currentStaff);

        $this->em->persist($redemption);
        $this->em->persist($transaction);
        $this->em->flush();

        return $this->json([
            'redemptionId'    => (string) $redemption->getId(),
            'rewardId'        => (string) $reward->getId(),
            'rewardName'      => $reward->getName(),
            'pointsSpent'     => $cost,
            'availablePoints' => $loyalty->getAvailablePoints(),
            'confirmedAt'     => $redemption->getConfirmedAt()?->format(\DateTimeInterface::ATOM),
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
