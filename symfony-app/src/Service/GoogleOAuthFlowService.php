<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Exception\GoogleOAuthFlowException;
use App\Repository\ProfileRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

final class GoogleOAuthFlowService
{
    public function __construct(
        private readonly GoogleOAuthProviderInterface $googleOAuthProvider,
        private readonly GoogleOAuthStateSigner $googleOAuthStateSigner,
        private readonly GoogleStaffRegistrationPendingSigner $googleStaffRegistrationPendingSigner,
        private readonly UserRepository $userRepository,
        private readonly ProfileRepository $profileRepository,
        private readonly StaffMemberRepository $staffMemberRepository,
        private readonly StaffRegistrationService $staffRegistrationService,
        private readonly PwaGoogleClientProvisioningService $pwaGoogleClientProvisioningService,
        private readonly EntityManagerInterface $em,
    ) {}

    public function start(GoogleOAuthStartInput $input): GoogleOAuthStartResult
    {
        $redirectUri = $this->normalizeRedirectUri($input->redirectUri);
        $context = trim($input->context);

        if (!GoogleOAuthContext::isSupported($context)) {
            throw GoogleOAuthFlowException::badRequest('Contesto Google OAuth non supportato.');
        }

        $payload = match ($context) {
            GoogleOAuthContext::STAFF_LOGIN => new GoogleOAuthStatePayload(
                context: $context,
                nonce: bin2hex(random_bytes(16)),
                issuedAt: time(),
                redirectTo: $this->sanitizeRelativePath($input->redirectTo, '/dashboard'),
            ),
            GoogleOAuthContext::STAFF_REGISTER => $this->buildStaffRegisterStatePayload($input),
            GoogleOAuthContext::PWA => $this->buildPwaStatePayload($input),
            default => throw GoogleOAuthFlowException::badRequest('Contesto Google OAuth non supportato.'),
        };

        $stateToken = $this->googleOAuthStateSigner->issue($payload);

        return new GoogleOAuthStartResult(
            authorizationUrl: $this->googleOAuthProvider->getAuthorizationUrl($redirectUri, $stateToken),
            stateToken: $stateToken,
        );
    }

    public function complete(GoogleOAuthCompleteInput $input): GoogleOAuthCompleteResult
    {
        return $this->withoutTenantFilter(function () use ($input): GoogleOAuthCompleteResult {
            $redirectUri = $this->normalizeRedirectUri($input->redirectUri);
            $state = trim($input->state);
            $stateCookie = trim($input->stateCookie);

            if ($state === '' || $stateCookie === '' || !hash_equals($state, $stateCookie)) {
                throw GoogleOAuthFlowException::invalidState();
            }

            $statePayload = $this->googleOAuthStateSigner->verify($state);
            $identity = $this->googleOAuthProvider->exchangeCodeForIdentity($redirectUri, trim($input->code));

            return match ($statePayload->context) {
                GoogleOAuthContext::STAFF_LOGIN => $this->completeStaffLogin($identity, $statePayload),
                GoogleOAuthContext::STAFF_REGISTER => $this->completeStaffRegister($identity, $statePayload),
                GoogleOAuthContext::PWA => $this->completePwaProvisioning($identity, $statePayload),
                default => throw GoogleOAuthFlowException::badRequest('Contesto Google OAuth non supportato.'),
            };
        });
    }

    private function completeStaffLogin(
        GoogleOAuthIdentity $identity,
        GoogleOAuthStatePayload $statePayload,
    ): GoogleOAuthCompleteResult {
        $user = $this->userRepository->findOneBy(['email' => $identity->email]);
        if (!$user instanceof User) {
            throw GoogleOAuthFlowException::staffAccountNotFound();
        }

        $profile = $this->profileRepository->find($user->getId());
        if (!$profile instanceof Profile) {
            throw GoogleOAuthFlowException::staffAccountNotFound();
        }

        $membership = $this->findActiveStaffMembership($profile);
        if (!$membership instanceof StaffMember) {
            throw GoogleOAuthFlowException::staffAccountNotFound();
        }

        $this->hydrateProfileFromGoogle($profile, $identity, false);
        $this->em->flush();

        return GoogleOAuthCompleteResult::staff($user, $statePayload->redirectTo ?? '/dashboard');
    }

    private function completeStaffRegister(
        GoogleOAuthIdentity $identity,
        GoogleOAuthStatePayload $statePayload,
    ): GoogleOAuthCompleteResult {
        $fullName = trim($statePayload->fullName ?? '') !== ''
            ? $statePayload->fullName
            : $identity->fullName;

        $pendingToken = $this->googleStaffRegistrationPendingSigner->issue(
            new GoogleStaffRegistrationPendingPayload(
                email: $identity->email,
                issuedAt: time(),
                fullName: trim($fullName) !== '' ? $fullName : null,
                avatarUrl: $identity->avatarUrl,
            ),
        );

        return GoogleOAuthCompleteResult::staffRegisterPending(
            $pendingToken,
            $identity->email,
            trim($fullName) !== '' ? $fullName : null,
        );
    }

    private function completePwaProvisioning(
        GoogleOAuthIdentity $identity,
        GoogleOAuthStatePayload $statePayload,
    ): GoogleOAuthCompleteResult {
        $tenantSlug = $statePayload->tenantSlug;
        if ($tenantSlug === null || trim($tenantSlug) === '') {
            throw GoogleOAuthFlowException::tenantNotFound();
        }

        $result = $this->pwaGoogleClientProvisioningService->provision($tenantSlug, $identity);

        return GoogleOAuthCompleteResult::pwa(
            tenantSlug: $result->tenant->getSlug(),
            returnTo: $statePayload->returnTo ?? '/profilo',
            googleIdToken: $identity->idToken,
            googleAccessToken: $identity->accessToken,
            isNewClient: $result->isNewClient,
        );
    }

    private function buildStaffRegisterStatePayload(GoogleOAuthStartInput $input): GoogleOAuthStatePayload
    {
        return new GoogleOAuthStatePayload(
            context: GoogleOAuthContext::STAFF_REGISTER,
            nonce: bin2hex(random_bytes(16)),
            issuedAt: time(),
            redirectTo: '/register',
            fullName: $this->sanitizeOptionalText($input->fullName),
        );
    }

    private function buildPwaStatePayload(GoogleOAuthStartInput $input): GoogleOAuthStatePayload
    {
        $tenantSlug = trim((string) $input->tenantSlug);
        if ($tenantSlug === '') {
            throw GoogleOAuthFlowException::badRequest('Tenant slug mancante per il login PWA.');
        }

        return new GoogleOAuthStatePayload(
            context: GoogleOAuthContext::PWA,
            nonce: bin2hex(random_bytes(16)),
            issuedAt: time(),
            tenantSlug: $tenantSlug,
            returnTo: $this->sanitizeRelativePath($input->returnTo, '/profilo'),
        );
    }

    private function normalizeRedirectUri(string $redirectUri): string
    {
        $candidate = trim($redirectUri);
        if ($candidate === '') {
            throw GoogleOAuthFlowException::badRequest('Redirect URI Google mancante.');
        }

        if (!str_starts_with($candidate, 'http://') && !str_starts_with($candidate, 'https://')) {
            throw GoogleOAuthFlowException::badRequest('Redirect URI Google non valida.');
        }

        return $candidate;
    }

    private function sanitizeRelativePath(?string $path, string $fallback): string
    {
        $candidate = trim((string) $path);
        if ($candidate === '') {
            return $fallback;
        }

        if (!str_starts_with($candidate, '/') || str_starts_with($candidate, '//') || str_contains($candidate, '://')) {
            return $fallback;
        }

        return $candidate;
    }

    private function sanitizeOptionalText(?string $value): ?string
    {
        $candidate = trim((string) $value);

        return $candidate !== '' ? $candidate : null;
    }

    private function findActiveStaffMembership(Profile $profile): ?StaffMember
    {
        return $this->staffMemberRepository->createQueryBuilder('staff_member')
            ->andWhere('staff_member.profile = :profile')
            ->andWhere('staff_member.isActive = true')
            ->andWhere('staff_member.deletedAt IS NULL')
            ->setParameter('profile', $profile)
            ->orderBy('staff_member.createdAt', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function hydrateProfileFromGoogle(
        Profile $profile,
        GoogleOAuthIdentity $identity,
        bool $forceFullName,
    ): void {
        if ($forceFullName || trim((string) $profile->getFullName()) === '') {
            $fullName = trim($identity->fullName);
            if ($fullName !== '') {
                $profile->setFullName($fullName);
            }
        }

        if ($identity->avatarUrl !== null && trim((string) $profile->getAvatarUrl()) === '') {
            $profile->setAvatarUrl($identity->avatarUrl);
        }
    }

    /**
     * Google OAuth endpoints run before tenant resolution, so server-side
     * provisioning must bypass the fail-closed tenant filter explicitly.
     *
     * @template T
     *
     * @param callable(): T $callback
     *
     * @return T
     */
    private function withoutTenantFilter(callable $callback): mixed
    {
        $filters = $this->em->getFilters();
        $wasEnabled = $filters->isEnabled('tenant_filter');

        if ($wasEnabled) {
            $filters->disable('tenant_filter');
        }

        try {
            return $callback();
        } finally {
            if ($wasEnabled) {
                $filters->enable('tenant_filter');
            }
        }
    }
}
