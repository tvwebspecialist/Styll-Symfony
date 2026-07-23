<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\EmailVerificationToken;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class PwaClientOtpEndpointTest extends WebTestCase
{
    private const TENANT_A_SLUG = 'tenant-a-api';

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

    public function testSendOtpReturnsGenericMessage(): void
    {
        $this->client->jsonRequest('POST', '/api/pwa/otp/send', [
            'email' => 'pwa-client@example.test',
        ]);

        self::assertResponseIsSuccessful();
        self::assertArrayHasKey('message', $this->responsePayload());
    }

    public function testSendOtpWithInvalidEmailReturnsBadRequest(): void
    {
        $this->client->jsonRequest('POST', '/api/pwa/otp/send', [
            'email' => 'not-an-email',
        ]);

        self::assertResponseStatusCodeSame(400);
    }

    public function testVerifyOtpWithValidCodeProvisionsNewClient(): void
    {
        $email = 'new-pwa-client@example.test';

        // Issue OTP manually
        $otp = $this->seedOtp($email);

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => self::TENANT_A_SLUG,
            'full_name' => 'Mario Cliente',
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertTrue($payload['is_new_client']);
        self::assertIsString($payload['token']);
        self::assertNotEmpty($payload['token']);

        // Use raw SQL to bypass TenantFilter (no tenant context in this request)
        $row = $this->em->getConnection()->fetchAssociative(
            'SELECT full_name FROM clients WHERE email = :email AND deleted_at IS NULL',
            ['email' => $email],
        );
        self::assertIsArray($row);
        self::assertSame('Mario Cliente', $row['full_name']);
    }

    public function testVerifyOtpLinksExistingUnlinkedClient(): void
    {
        $email = 'existing-unlinked@example.test';
        $otp = $this->seedOtp($email);

        // Pre-existing client without profile_id
        $this->em->getConnection()->executeStatement(
            "INSERT INTO clients (id, tenant_id, full_name, email, marketing_consent, tags, created_at, updated_at)
             SELECT gen_random_uuid(), t.id, 'Cliente Esistente', :email, false, '[]'::jsonb, now(), now()
             FROM tenants t WHERE t.slug = :slug",
            ['email' => $email, 'slug' => self::TENANT_A_SLUG],
        );

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertFalse($payload['is_new_client']);

        // Client should now have a profile_id linked
        $this->em->clear();
        $row = $this->em->getConnection()->fetchAssociative(
            'SELECT profile_id FROM clients WHERE email = :email AND deleted_at IS NULL',
            ['email' => $email],
        );
        self::assertNotNull($row['profile_id'] ?? null);
    }

    public function testVerifyOtpWithWrongCodeFails(): void
    {
        $email = 'wrong-code@example.test';
        $this->seedOtp($email);

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => '000000',
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testVerifyOtpIsMonouso(): void
    {
        $email = 'mono-uso@example.test';
        $otp = $this->seedOtp($email);

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);
        self::assertResponseIsSuccessful();

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testVerifyWithExpiredOtpFails(): void
    {
        $email = 'expired-otp@example.test';
        $token = new EmailVerificationToken();
        $token->setEmail($email);
        $token->setCode('123456');
        $token->setExpiresAt(new \DateTimeImmutable('-1 second'));
        $this->em->persist($token);
        $this->em->flush();

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => '123456',
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);
        self::assertResponseStatusCodeSame(422);
    }

    public function testVerifyLocksAfterMaxAttemptsAndRateLimitsTheSixthAttempt(): void
    {
        $email = 'lockout@example.test';
        $this->seedOtp($email);

        for ($i = 0; $i < 5; $i++) {
            $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
                'email' => $email,
                'code' => '000000',
                'tenant_slug' => self::TENANT_A_SLUG,
            ]);

            self::assertResponseStatusCodeSame(422);
        }

        $tokenRow = $this->em->getConnection()->fetchAssociative(
            'SELECT attempts, locked_until FROM email_verification_tokens WHERE email = :email ORDER BY created_at DESC LIMIT 1',
            ['email' => $email],
        );
        self::assertIsArray($tokenRow);
        self::assertSame(5, (int) ($tokenRow['attempts'] ?? 0));
        self::assertNotNull($tokenRow['locked_until'] ?? null);

        // 6th attempt — the endpoint-level limiter should now answer before the service lockout message leaks.
        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => '000000',
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);
        $payload = $this->responsePayload();
        self::assertResponseStatusCodeSame(429);
        self::assertSame('Troppe richieste. Riprova più tardi.', $payload['error'] ?? null);
    }

    public function testVerifyOtpTenantIsolation(): void
    {
        $email = 'cross-tenant@example.test';
        $otp = $this->seedOtp($email);

        // Verifying against a nonexistent tenant should fail
        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => 'nonexistent-tenant-slug',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testProfileUpdateWithValidJwtUpdatesClient(): void
    {
        $email = 'profile-update@example.test';
        $otp = $this->seedOtp($email);

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => $otp,
            'tenant_slug' => self::TENANT_A_SLUG,
            'full_name' => 'Nome Placeholder',
        ]);

        self::assertResponseIsSuccessful();
        $jwt = $this->responsePayload()['token'];

        $this->client->request('PATCH', '/api/pwa/client/profile', [], [], [
            'HTTP_Authorization' => "Bearer {$jwt}",
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['full_name' => 'Nome Aggiornato', 'phone' => '+393331234567']));

        self::assertResponseIsSuccessful();

        $row = $this->em->getConnection()->fetchAssociative(
            'SELECT full_name, phone FROM clients WHERE email = :email AND deleted_at IS NULL',
            ['email' => $email],
        );
        self::assertIsArray($row);
        self::assertSame('Nome Aggiornato', $row['full_name']);
        self::assertSame('+393331234567', $row['phone']);
    }

    public function testProfileUpdateWithoutJwtReturnsUnauthorized(): void
    {
        $this->client->request('PATCH', '/api/pwa/client/profile', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['full_name' => 'Test']));

        self::assertResponseStatusCodeSame(401);
    }

    public function testProfileUpdateWithStaffJwtReturnsForbidden(): void
    {
        // Login as staff to get a non-ROLE_PWA_CLIENT JWT
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseIsSuccessful();
        $staffJwt = $this->responsePayload()['token'];

        $this->client->request('PATCH', '/api/pwa/client/profile', [], [], [
            'HTTP_Authorization' => "Bearer {$staffJwt}",
            'CONTENT_TYPE' => 'application/json',
        ], json_encode(['full_name' => 'Test']));

        self::assertResponseStatusCodeSame(403);
    }

    /** Seeds an OTP directly into DB and returns the code. */
    private function seedOtp(string $email, string $code = '654321'): string
    {
        $token = new EmailVerificationToken();
        $token->setEmail($email);
        $token->setCode($code);
        $this->em->persist($token);
        $this->em->flush();

        return $code;
    }

    /**
     * @return array<string, mixed>
     */
    private function responsePayload(): array
    {
        $content = $this->client->getResponse()->getContent();
        $payload = json_decode($content, true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }
}
