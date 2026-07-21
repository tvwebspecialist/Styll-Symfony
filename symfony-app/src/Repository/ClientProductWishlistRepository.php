<?php
declare(strict_types=1);
namespace App\Repository;
use App\Entity\ClientProductWishlist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
class ClientProductWishlistRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ClientProductWishlist::class);
    }
}
