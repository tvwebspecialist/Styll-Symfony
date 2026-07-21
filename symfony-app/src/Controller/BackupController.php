<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\BackupRun;
use App\Repository\BackupRunRepository;
use App\Service\BackupVerifyService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api')]
final class BackupController extends AbstractController
{
    public function __construct(
        private readonly string $backupReportToken,
        private readonly string $adminApiToken,
        private readonly BackupRunRepository $backupRunRepository,
        private readonly EntityManagerInterface $em,
        private readonly BackupVerifyService $verifyService,
    ) {}

    /**
     * Called by the bash backup script to record a backup run.
     * Auth: X-Backup-Token header (static secret, no JWT).
     */
    #[Route('/internal/backups/report', methods: ['POST'])]
    public function report(Request $request): JsonResponse
    {
        if (!$this->validateToken($request, 'X-Backup-Token', $this->backupReportToken)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        $status = $data['status'] ?? null;
        if (!in_array($status, ['success', 'failure'], true)) {
            return $this->json(['error' => 'status must be "success" or "failure"'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $run = new BackupRun();
        $run->setStatus($status);
        $run->setFileName($data['file_name'] ?? null);
        $run->setSizeBytes(isset($data['size_bytes']) ? (int) $data['size_bytes'] : null);
        $run->setErrorMessage($data['error_message'] ?? null);

        if (isset($data['started_at'])) {
            $run->setStartedAt(new \DateTimeImmutable($data['started_at']));
        }
        if (isset($data['finished_at'])) {
            $run->setFinishedAt(new \DateTimeImmutable($data['finished_at']));
        }

        $this->em->persist($run);
        $this->em->flush();

        return $this->json(['id' => (string) $run->getId()], Response::HTTP_CREATED);
    }

    /**
     * Returns the last 30 backup runs.
     * Auth: X-Admin-Token header (static secret shared with Next.js server-side proxy).
     */
    #[Route('/admin/backups', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        if (!$this->validateToken($request, 'X-Admin-Token', $this->adminApiToken)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $runs = $this->backupRunRepository->findLatest(30);

        return $this->json(array_map(fn (BackupRun $r) => $r->toArray(), $runs));
    }

    /**
     * Verifies a backup by restoring it to an isolated temp database.
     * Auth: X-Admin-Token header.
     */
    #[Route('/admin/backups/{id}/verify', methods: ['POST'])]
    public function verify(Request $request, string $id): JsonResponse
    {
        if (!$this->validateToken($request, 'X-Admin-Token', $this->adminApiToken)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json(['error' => 'Invalid ID'], Response::HTTP_BAD_REQUEST);
        }

        $run = $this->backupRunRepository->find(Uuid::fromString($id));
        if ($run === null) {
            return $this->json(['error' => 'Backup run not found'], Response::HTTP_NOT_FOUND);
        }

        $result = $this->verifyService->verify($run);

        return $this->json($result, $result['success'] ? Response::HTTP_OK : Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    private function validateToken(Request $request, string $headerName, string $expectedToken): bool
    {
        if ($expectedToken === '') {
            return false;
        }
        $received = $request->headers->get($headerName, '');
        return hash_equals($expectedToken, $received);
    }
}
