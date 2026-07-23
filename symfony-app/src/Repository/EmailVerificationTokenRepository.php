<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\EmailVerificationToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EmailVerificationTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EmailVerificationToken::class);
    }

    /** Returns the most recent unexpired, unused token for this email (for resend throttle). */
    public function findActiveSendToken(string $email): ?EmailVerificationToken
    {
        return $this->createQueryBuilder('t')
            ->where('t.email = :email')
            ->andWhere('t.used = false')
            ->andWhere('t.expiresAt > :now')
            ->setParameter('email', $email)
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('t.lastSentAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** Finds a valid, unlocked, unused token for this email with the given code. */
    public function findForVerification(string $email, string $code): ?EmailVerificationToken
    {
        return $this->createQueryBuilder('t')
            ->where('t.email = :email')
            ->andWhere('t.code = :code')
            ->andWhere('t.used = false')
            ->andWhere('t.expiresAt > :now')
            ->andWhere('t.lockedUntil IS NULL OR t.lockedUntil < :now')
            ->setParameter('email', $email)
            ->setParameter('code', $code)
            ->setParameter('now', new \DateTimeImmutable())
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** Finds a token by email regardless of code, for attempt counting. */
    public function findActiveForEmail(string $email): ?EmailVerificationToken
    {
        return $this->createQueryBuilder('t')
            ->where('t.email = :email')
            ->andWhere('t.used = false')
            ->andWhere('t.expiresAt > :now')
            ->setParameter('email', $email)
            ->setParameter('now', new \DateTimeImmutable())
            ->orderBy('t.lastSentAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** Marks all pending tokens for the email as used (called before issuing a new one). */
    public function invalidateAllForEmail(string $email): void
    {
        $this->createQueryBuilder('t')
            ->update()
            ->set('t.used', 'true')
            ->where('t.email = :email')
            ->andWhere('t.used = false')
            ->setParameter('email', $email)
            ->getQuery()
            ->execute();
    }
}
