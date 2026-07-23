<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\EmailVerificationToken;
use App\Security\TenantContext;
use App\Service\GoogleOAuthIdentity;
use App\Service\LeagueGoogleOAuthProvider;
use App\Tests\Support\FakeGoogleOAuthProvider;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class AuthRateLimitingTest extends WebTestCase
{
    private const TENANT_A_SLUG = 'tenant-a-api';
    private const RATE_LIMIT_ERROR = 'Troppe richieste. Riprova più tardi.';
    private const GOOGLE_CALLBACK_URL = 'http://localhost:3000/api/auth/google/callback';

    private KernelBrowser $client;
    private EntityManagerInterface $em;

    protected function setUp(): void
    {
        $this->client = self::createClient();
        $this->client->disableReboot();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);
        $fixture->resetDatabase();
        $fixture->seedMultiTenantStaffUser();

        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();

        LeagueGoogleOAuthProvider::setTestOverride(new FakeGoogleOAuthProvider([
            'staff-register-code' => new GoogleOAuthIdentity(
                email: 'owner.google.register@example.test',
                googleId: 'google-staff-register-id',
                fullName: 'Marco Google',
                avatarUrl: 'https://cdn.example.test/google/marco.jpg',
                idToken: 'google-id-token-staff-register',
                accessToken: 'google-access-token-staff-register',
            ),
        ]));
    }

    protected function tearDown(): void
    {
        LeagueGoogleOAuthProvider::setTestOverride(null);
        parent::tearDown();
    }

    public function testLoginRateLimitReturns429AndResetsAfterWindow(): void
    {
        for ($attempt = 0; $attempt < 3; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/login', [
                'email' => TestTenantFixture::TENANT_A_EMAIL,
                'password' => 'wrong-password',
            ]);

            self::assertResponseStatusCodeSame(401);
        }

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
            'password' => TestTenantFixture::PASSWORD,
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testPasswordResetRequestRateLimitReturns429AndResetsAfterWindow(): void
    {
        for ($attempt = 0; $attempt < 3; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/password-reset/request', [
                'email' => TestTenantFixture::TENANT_A_EMAIL,
            ]);

            self::assertResponseIsSuccessful();
        }

        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/password-reset/request', [
            'email' => TestTenantFixture::TENANT_A_EMAIL,
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testPasswordResetConfirmRateLimitReturns429AndResetsAfterWindow(): void
    {
        $unknownToken = bin2hex(random_bytes(32));

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
                'token' => $unknownToken,
                'new_password' => 'New-Password-2026!',
            ]);

            self::assertResponseStatusCodeSame(422);
        }

        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $unknownToken,
            'new_password' => 'New-Password-2026!',
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/password-reset/confirm', [
            'token' => $unknownToken,
            'new_password' => 'New-Password-2026!',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testPwaOtpSendRateLimitReturns429AndResetsAfterWindow(): void
    {
        $email = 'pwa-rate-limit@example.test';

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/pwa/otp/send', [
                'email' => $email,
            ]);

            self::assertResponseIsSuccessful();
        }

        $this->client->jsonRequest('POST', '/api/pwa/otp/send', [
            'email' => $email,
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/pwa/otp/send', [
            'email' => $email,
        ]);

        self::assertResponseIsSuccessful();
    }

    public function testPwaOtpVerifyRateLimitReturns429AndResetsAfterWindow(): void
    {
        $email = 'otp-verify-rate-limit@example.test';

        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
                'email' => $email,
                'code' => '000000',
                'tenant_slug' => self::TENANT_A_SLUG,
            ]);

            self::assertResponseStatusCodeSame(422);
        }

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => '000000',
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/pwa/otp/verify', [
            'email' => $email,
            'code' => '000000',
            'tenant_slug' => self::TENANT_A_SLUG,
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testRegisterRateLimitAlsoSlowsDownSingleIpAcrossDifferentEmails(): void
    {
        for ($attempt = 0; $attempt < 3; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/register', [
                'email' => sprintf('owner-rate-limit-%d@example.test', $attempt),
                'password' => 'Owner-Register-2026!',
                'full_name' => sprintf('Owner %d', $attempt),
                'business_name' => sprintf('Rate Limit Barber %d', $attempt),
                'accepted_terms' => true,
            ]);

            self::assertResponseStatusCodeSame(201);
        }

        $this->client->jsonRequest('POST', '/api/register', [
            'email' => 'owner-rate-limit-blocked@example.test',
            'password' => 'Owner-Register-2026!',
            'full_name' => 'Owner Blocked',
            'business_name' => 'Rate Limit Barber Blocked',
            'accepted_terms' => true,
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/register', [
            'email' => 'owner-rate-limit-reset@example.test',
            'password' => 'Owner-Register-2026!',
            'full_name' => 'Owner Reset',
            'business_name' => 'Rate Limit Barber Reset',
            'accepted_terms' => true,
        ]);

        self::assertResponseStatusCodeSame(201);
    }

    public function testGoogleStaffRegisterStartRateLimitReturns429AndResetsAfterWindow(): void
    {
        for ($attempt = 0; $attempt < 3; ++$attempt) {
            $this->client->jsonRequest('POST', '/api/oauth/google/start', [
                'context' => 'staff_register',
                'redirect_uri' => self::GOOGLE_CALLBACK_URL,
                'full_name' => 'Marco Google',
            ]);

            self::assertResponseIsSuccessful();
        }

        $this->client->jsonRequest('POST', '/api/oauth/google/start', [
            'context' => 'staff_register',
            'redirect_uri' => self::GOOGLE_CALLBACK_URL,
            'full_name' => 'Marco Google',
        ]);

        self::assertResponseStatusCodeSame(429);
        self::assertSame(self::RATE_LIMIT_ERROR, $this->responsePayload()['error'] ?? null);

        $this->waitForRateLimitWindowReset();

        $this->client->jsonRequest('POST', '/api/oauth/google/start', [
            'context' => 'staff_register',
            'redirect_uri' => self::GOOGLE_CALLBACK_URL,
            'full_name' => 'Marco Google',
        ]);

        self::assertResponseIsSuccessful();
    }

    private function seedOtp(string $email, string $code = '654321'): void
    {
        $this->em->getConnection()->executeStatement(
            'DELETE FROM email_verification_tokens WHERE email = :email',
            ['email' => $email],
        );

        $token = new EmailVerificationToken();
        $token->setEmail($email);
        $token->setCode($code);
        $this->em->persist($token);
        $this->em->flush();
    }

    private function waitForRateLimitWindowReset(): void
    {
        usleep(1_200_000);
    }

    /**
     * @return array<string, mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }
}
