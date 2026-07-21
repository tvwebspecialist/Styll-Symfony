<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\RewardRedemption;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class RewardRedemptionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RewardRedemption::class);
    }
}
