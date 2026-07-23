<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Client;
use App\Entity\ClientNote;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

/**
 * Endpoints for client notes.
 *
 * Notes are ALWAYS staff-private — never exposed to the client PWA.
 * TenantFilter is active for all ORM queries here.
 */
#[Route('/api/clients/{clientId}/notes')]
final class ClientNotesController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    #[Route('', methods: ['GET'])]
    public function list(string $clientId): JsonResponse
    {
        $client = $this->resolveClient($clientId);

        $notes = $this->em->getRepository(ClientNote::class)->findBy(
            ['client' => $client],
            ['createdAt' => 'DESC'],
        );

        return $this->json(array_map(fn (ClientNote $note): array => $this->serializeNote($note), $notes));
    }

    #[Route('', methods: ['POST'])]
    public function create(string $clientId, Request $request): JsonResponse
    {
        $client = $this->resolveClient($clientId);
        $payload = $request->toArray();

        $text = trim((string) ($payload['noteText'] ?? $payload['note_text'] ?? ''));
        if ($text === '') {
            return $this->json(['error' => 'La nota non può essere vuota.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $staffMember = $this->resolveCurrentStaffMember();
        if ($staffMember === null) {
            return $this->json(['error' => 'Nessun membro staff trovato per il tenant corrente.'], Response::HTTP_FORBIDDEN);
        }

        $note = (new ClientNote())
            ->setTenant($client->getTenant())
            ->setClient($client)
            ->setStaff($staffMember)
            ->setNoteText($text);

        $this->em->persist($note);
        $this->em->flush();

        return $this->json($this->serializeNote($note), Response::HTTP_CREATED);
    }

    private function resolveClient(string $clientId): Client
    {
        if (!Uuid::isValid($clientId)) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        $tenantId = $this->tenantContext->getTenantId();
        if ($tenantId === null) {
            throw $this->createAccessDeniedException();
        }

        // TenantFilter ensures only clients of the current tenant are returned.
        $client = $this->em->getRepository(Client::class)->find(Uuid::fromString($clientId));

        if ($client === null || $client->isDeleted()) {
            throw $this->createNotFoundException('Cliente non trovato.');
        }

        return $client;
    }

    private function resolveCurrentStaffMember(): ?StaffMember
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return null;
        }

        // Profile.id == User.id; TenantFilter limits to current tenant.
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

    /**
     * @return array<string, mixed>
     */
    private function serializeNote(ClientNote $note): array
    {
        $staff = $note->getStaff();
        $profile = $staff->getProfile();

        return [
            'id' => $note->getId()->toRfc4122(),
            'clientId' => $note->getClient()->getId()->toRfc4122(),
            'noteText' => $note->getNoteText(),
            'staffId' => $staff->getId()->toRfc4122(),
            'staffName' => $profile->getFullName() ?? '—',
            'createdAt' => $note->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
