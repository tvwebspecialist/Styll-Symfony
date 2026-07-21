<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Profile;
use App\Entity\User;
use App\Repository\ProfileRepository;
use App\Security\ResolvedStaffAccess;
use App\Security\StaffTenantAccessResolver;
use App\Security\StaffTenantMembership;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class MeController extends AbstractController
{
    public function __construct(
        private readonly ProfileRepository $profileRepository,
        private readonly StaffTenantAccessResolver $staffTenantAccessResolver,
    ) {}

    #[Route('/api/me', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $profile = $this->profileRepository->find($user->getId());
        if (!$profile instanceof Profile) {
            return $this->json(['error' => 'Profile not found'], Response::HTTP_NOT_FOUND);
        }

        $resolvedAccess = $this->staffTenantAccessResolver->resolveForUser($user);
        if ($resolvedAccess->hasRequestedTenantSelection() && $resolvedAccess->currentMembership === null) {
            return $this->json(['error' => 'Tenant access denied'], Response::HTTP_FORBIDDEN);
        }

        return $this->json([
            'user' => [
                'id' => $user->getId()->toRfc4122(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
            ],
            'profile' => [
                'id' => $profile->getId()->toRfc4122(),
                'userType' => $profile->getUserType(),
                'fullName' => $profile->getFullName(),
                'phone' => $profile->getPhone(),
                'avatarUrl' => $profile->getAvatarUrl(),
                'bio' => $profile->getBio(),
                'language' => $profile->getLanguage(),
                'timezone' => $profile->getTimezone(),
                'notificationPreferences' => $profile->getNotificationPreferences(),
                'onboardingCompleted' => $profile->isOnboardingCompleted(),
                'workMode' => $profile->getWorkMode(),
            ],
            'currentTenant' => $resolvedAccess->currentMembership?->toMembershipArray(),
            'currentRole' => $resolvedAccess->currentMembership?->role,
            'otherTenants' => $this->mapMemberships($resolvedAccess),
        ]);
    }

    /**
     * @return list<array{
     *     staffMemberId: string,
     *     role: string,
     *     tenant: array{
     *         id: string,
     *         slug: string,
     *         businessName: string,
     *         logoUrl: ?string,
     *         status: string,
     *         timezone: string
     *     }
     * }>
     */
    private function mapMemberships(ResolvedStaffAccess $resolvedAccess): array
    {
        return array_map(
            static fn (StaffTenantMembership $membership): array => $membership->toMembershipArray(),
            $resolvedAccess->otherMemberships(),
        );
    }
}
