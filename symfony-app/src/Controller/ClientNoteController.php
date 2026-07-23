<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ClientNote;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * PATCH and DELETE on a single client note.
 *
 * Notes are staff-private. Tenant isolation enforced by comparing note.tenant with
 * the current TenantContext.
 */
#[Route('/api/client-notes/{noteId}')]
final class ClientNoteController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', methods: ['PATCH'])]
    public function update(string $noteId, Request $request): JsonResponse
    {
        $note = $this->resolveNote($noteId);
        $payload = $request->toArray();

        $text = trim((string) ($payload['noteText'] ?? $payload['note_text'] ?? ''));
        if ($text === '') {
            return $this->json(['error' => 'La nota non può essere vuota.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $note->setNoteText($text);
        $this->em->flush();

        return $this->json([
            'id' => $note->getId()->toRfc4122(),
            'noteText' => $note->getNoteText(),
            'updatedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('', methods: ['DELETE'])]
    public function delete(string $noteId): JsonResponse
    {
        $note = $this->resolveNote($noteId);

        $this->em->remove($note);
        $this->em->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    private function resolveNote(string $noteId): ClientNote
    {
        if (!Uuid::isValid($noteId)) {
            throw $this->createNotFoundException('Nota non trovata.');
        }

        $tenantId = $this->tenantContext->getTenantId();
        if ($tenantId === null) {
            throw $this->createAccessDeniedException();
        }

        $note = $this->em->getRepository(ClientNote::class)->findOneBy([
            'id' => Uuid::fromString($noteId),
        ]);

        if ($note === null || !$note->getTenant()->getId()->equals($tenantId)) {
            throw $this->createNotFoundException('Nota non trovata.');
        }

        return $note;
    }
}
