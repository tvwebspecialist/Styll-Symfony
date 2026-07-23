<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Security\SuperadminAccessChecker;
use App\Service\AdminImageStorageService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin')]
final class AdminImageUploadController extends AbstractController
{
    public function __construct(
        private readonly SuperadminAccessChecker $superadminAccessChecker,
        private readonly AdminImageStorageService $adminImageStorageService,
    ) {}

    #[Route('/uploads/image', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $this->requireSuperadminUser();

        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'File mancante.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $url = $this->adminImageStorageService->store(
                $file,
                (string) $request->request->get('bucket', ''),
                (string) $request->request->get('pathPrefix', 'misc'),
            );
        } catch (\InvalidArgumentException $exception) {
            return $this->json(['error' => $exception->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['url' => $url], Response::HTTP_CREATED);
    }

    private function requireSuperadminUser(): User
    {
        $user = $this->getUser();
        \assert($user === null || $user instanceof User);

        return $this->superadminAccessChecker->requireAuthenticatedSuperadmin($user);
    }
}
