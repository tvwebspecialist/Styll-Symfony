<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Profile;
use App\Entity\Tenant;
use App\Entity\User;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class RegisterEndpointTest extends WebTestCase
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

        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testRegisterCreatesAuthenticableOwnerWithBootstrapData(): void
    {
        $email = 'owner@marcos-barbershop.example.test';
        $password = 'Owner-Register-2026!';

        $this->client->jsonRequest('POST', '/api/register', [
            'email' => $email,
            'password' => $password,
            'full_name' => 'Marco Rossi',
            'business_name' => "Marco's Barbershop",
            'business_type' => 'barbiere',
            'accepted_terms' => true,
        ]);

        self::assertResponseStatusCodeSame(201);

        $payload = $this->responsePayload();
        self::assertSame('marco-s-barbershop', $payload['tenantSlug'] ?? null);
        self::assertSame('owner', $payload['currentRole'] ?? null);
        self::assertIsString($payload['token'] ?? null);

        $this->em->clear();

        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        self::assertInstanceOf(User::class, $user);
        self::assertNotSame($password, $user->getPassword());

        $passwordHasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        self::assertTrue($passwordHasher->isPasswordValid($user, $password));

        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        self::assertInstanceOf(Profile::class, $profile);
        self::assertSame('Marco Rossi', $profile->getFullName());
        self::assertTrue($profile->isOnboardingCompleted());
        self::assertSame('solo', $profile->getWorkMode());

        $tenant = $this->em->getRepository(Tenant::class)->findOneBy(['slug' => 'marco-s-barbershop']);
        self::assertInstanceOf(Tenant::class, $tenant);

        $staffMembershipRow = $this->em->getConnection()->fetchAssociative(
            'SELECT id, role FROM staff_members WHERE tenant_id = :tenant_id AND profile_id = :profile_id',
            [
                'tenant_id' => $tenant->getId()->toRfc4122(),
                'profile_id' => $profile->getId()->toRfc4122(),
            ],
        );
        self::assertIsArray($staffMembershipRow);
        self::assertSame('owner', $staffMembershipRow['role'] ?? null);

        $locationCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM locations WHERE tenant_id = :tenant_id',
            ['tenant_id' => $tenant->getId()->toRfc4122()],
        );
        self::assertSame(1, $locationCount);

        $serviceCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM services WHERE tenant_id = :tenant_id',
            ['tenant_id' => $tenant->getId()->toRfc4122()],
        );
        self::assertSame(4, $serviceCount);

        $staffLocationCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM staff_locations WHERE staff_id = :staff_id',
            ['staff_id' => $staffMembershipRow['id']],
        );
        self::assertSame(1, $staffLocationCount);

        $staffServiceCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM staff_services WHERE staff_id = :staff_id',
            ['staff_id' => $staffMembershipRow['id']],
        );
        self::assertSame(4, $staffServiceCount);

        $workingHourCount = (int) $this->em->getConnection()->fetchOne(
            'SELECT COUNT(*) FROM working_hours WHERE staff_id = :staff_id',
            ['staff_id' => $staffMembershipRow['id']],
        );
        self::assertSame(6, $workingHourCount);

        $legalAcceptanceRow = $this->em->getConnection()->fetchAssociative(
            'SELECT document_type, document_version, privacy_notice_version, source FROM legal_acceptance_events WHERE user_id = :user_id',
            ['user_id' => $user->getId()->toRfc4122()],
        );
        self::assertIsArray($legalAcceptanceRow);
        self::assertSame('B2B_TERMS', $legalAcceptanceRow['document_type'] ?? null);
        self::assertSame('1.3', $legalAcceptanceRow['document_version'] ?? null);
        self::assertSame('1.5', $legalAcceptanceRow['privacy_notice_version'] ?? null);
        self::assertSame('EMAIL_PASSWORD_REGISTER', $legalAcceptanceRow['source'] ?? null);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$payload['token'],
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $mePayload = $this->responsePayload();
        self::assertSame($email, $mePayload['user']['email'] ?? null);
        self::assertSame('Marco Rossi', $mePayload['profile']['fullName'] ?? null);
        self::assertSame('marco-s-barbershop', $mePayload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $mePayload['currentRole'] ?? null);
    }

    public function testRegisterRejectsDuplicateEmailWithConflict(): void
    {
        $payload = [
            'email' => 'duplicate-owner@example.test',
            'password' => 'Owner-Register-2026!',
            'full_name' => 'Duplicate Owner',
            'business_name' => 'Prima Attività',
            'accepted_terms' => true,
        ];

        $this->client->jsonRequest('POST', '/api/register', $payload);
        self::assertResponseStatusCodeSame(201);

        $this->client->jsonRequest('POST', '/api/register', [
            ...$payload,
            'business_name' => 'Seconda Attività',
        ]);

        self::assertResponseStatusCodeSame(409);
        self::assertSame('Email già in uso.', $this->responsePayload()['error'] ?? null);
    }

    public function testRegisterGeneratesUniqueSlugWhenBusinessNameCollides(): void
    {
        $this->em->persist(
            (new Tenant())
                ->setBusinessName('Marco Barber')
                ->setSlug('marco-barber'),
        );
        $this->em->flush();

        $this->client->jsonRequest('POST', '/api/register', [
            'email' => 'owner-2@marco-barber.example.test',
            'password' => 'Owner-Register-2026!',
            'full_name' => 'Owner Due',
            'business_name' => 'Marco Barber',
            'accepted_terms' => true,
        ]);

        self::assertResponseStatusCodeSame(201);

        $payload = $this->responsePayload();
        self::assertSame('marco-barber-2', $payload['tenantSlug'] ?? null);
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

    public function testRegisterRejectsMissingTermsAcceptance(): void
    {
        $this->client->jsonRequest('POST', '/api/register', [
            'email' => 'owner-no-terms@example.test',
            'password' => 'Owner-Register-2026!',
            'full_name' => 'Owner No Terms',
            'business_name' => 'No Terms Barber',
            'accepted_terms' => false,
        ]);

        self::assertResponseStatusCodeSame(400);
        self::assertSame(
            'Devi accettare i Termini di Servizio per continuare.',
            $this->responsePayload()['error'] ?? null,
        );
    }
}
