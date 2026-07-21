<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\LoyaltyConfig;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class LoyaltyConfigRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LoyaltyConfig::class);
    }
}
