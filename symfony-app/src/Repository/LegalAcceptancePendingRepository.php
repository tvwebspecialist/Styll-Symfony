<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\LegalAcceptancePending;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class LegalAcceptancePendingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LegalAcceptancePending::class);
    }
}
