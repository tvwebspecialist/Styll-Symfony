<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\PasswordResetToken;
use App\Entity\User;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class PasswordResetEndpointTest extends WebTestCase
{
    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();

        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);
        $fixture->resetDatabase();
        $fixture->seedMultiTenantStaffUser();

        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testRequestReturnsGenericMessageForExistingEmail(): void
    {
        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertArrayHasKey('message', $payload);
    }

    public function testRequestReturnsGenericMessageForNonExistingEmail(): void
    {
        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => 'does-not-exist@example.test',
        ]);

        // Same 200 + same message: no user enumeration
        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertArrayHasKey('message', $payload);
    }

    public function testBothRequestResponsesAreIdentical(): void
    {
        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
        ]);
        $existingPayload = $this->responsePayload();

        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => 'ghost@example.test',
        ]);
        $nonExistingPayload = $this->responsePayload();

        self::assertSame($existingPayload, $nonExistingPayload);
    }

    public function testConfirmWithValidTokenUpdatesPassword(): void
    {
        // Simulate a token as if the service had generated it
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $resetToken = new PasswordResetToken();
        $resetToken->setEmail(TestTenantFixture::TENANT_A_EMAIL);
        $resetToken->setTokenHash($tokenHash);
        $this->em->persist($resetToken);
        $this->em->flush();

        $newPassword = 'new-secure-password-2026!';

        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $rawToken,
            'new_password' => $newPassword,
        ]);

        self::assertResponseIsSuccessful();

        // Old password no longer works
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseStatusCodeSame(401);

        // New password works
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
            'password' => $newPassword,
        ]);
        self::assertResponseIsSuccessful();

        // Token is now marked used
        $this->em->clear();
        $usedToken = $this->em->getRepository(PasswordResetToken::class)
            ->findOneBy(['tokenHash' => $tokenHash]);
        self::assertInstanceOf(PasswordResetToken::class, $usedToken);
        self::assertTrue($usedToken->isUsed());
    }

    public function testConfirmWithExpiredTokenIsRejected(): void
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $resetToken = new PasswordResetToken();
        $resetToken->setEmail(TestTenantFixture::TENANT_A_EMAIL);
        $resetToken->setTokenHash($tokenHash);
        $resetToken->setExpiresAt(new \DateTimeImmutable('-1 second'));
        $this->em->persist($resetToken);
        $this->em->flush();

        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $rawToken,
            'new_password' => 'new-secure-password-2026!',
        ]);

        self::assertResponseStatusCodeSame(422);
        self::assertStringContainsString('scaduto', $this->responsePayload()['error'] ?? '');
    }

    public function testConfirmWithUnknownTokenIsRejected(): void
    {
        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => bin2hex(random_bytes(32)),
            'new_password' => 'new-secure-password-2026!',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testConfirmTokenIsMonouso(): void
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);

        $resetToken = new PasswordResetToken();
        $resetToken->setEmail(TestTenantFixture::TENANT_A_EMAIL);
        $resetToken->setTokenHash($tokenHash);
        $this->em->persist($resetToken);
        $this->em->flush();

        // First use succeeds
        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $rawToken,
            'new_password' => 'first-new-password-2026!',
        ]);
        self::assertResponseIsSuccessful();

        // Second use is rejected
        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $rawToken,
            'new_password' => 'second-attempt-2026!',
        ]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testRequestWithInvalidEmailReturnsBadRequest(): void
    {
        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => 'not-an-email',
        ]);

        self::assertResponseStatusCodeSame(400);
    }

    /**
     * @return array<string, mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode(
            $this->client->getResponse()->getContent(),
            true,
            flags: \JSON_THROW_ON_ERROR,
        );
        self::assertIsArray($payload);

        return $payload;
    }
}
