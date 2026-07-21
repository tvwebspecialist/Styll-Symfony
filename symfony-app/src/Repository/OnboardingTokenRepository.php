<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\OnboardingToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class OnboardingTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, OnboardingToken::class);
    }
}
