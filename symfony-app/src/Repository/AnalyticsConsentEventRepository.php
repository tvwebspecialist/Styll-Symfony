<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\AnalyticsConsentEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class AnalyticsConsentEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AnalyticsConsentEvent::class);
    }
}
