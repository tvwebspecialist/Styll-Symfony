<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class CreateStaffUserCommandTest extends WebTestCase
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

        $tenant = (new Tenant())
            ->setBusinessName('Barbiere di Prova')
            ->setSlug('barbiere-di-prova');

        $this->em = $container->get(EntityManagerInterface::class);
        $this->em->persist($tenant);
        $this->em->flush();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testCommandCreatesAuthenticableStaffUser(): void
    {
        $email = 'owner@barbiere-di-prova.local';
        $password = 'Owner-Bridge-2026!';

        $application = new Application(self::$kernel);
        $application->setAutoExit(false);

        $command = $application->find('app:create-staff-user');
        $tester = new CommandTester($command);
        $exitCode = $tester->execute([
            'email' => $email,
            'password' => $password,
            'tenant-slug' => 'barbiere-di-prova',
            'role' => 'owner',
            '--full-name' => 'Owner Barbiere Di Prova',
        ]);

        self::assertSame(Command::SUCCESS, $exitCode);
        self::assertStringContainsString('Created staff user', $tester->getDisplay());

        $this->em->clear();

        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        self::assertInstanceOf(User::class, $user);
        self::assertNotSame($password, $user->getPassword());

        $passwordHasher = self::getContainer()->get(UserPasswordHasherInterface::class);
        self::assertTrue($passwordHasher->isPasswordValid($user, $password));

        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        self::assertInstanceOf(Profile::class, $profile);
        self::assertSame('Owner Barbiere Di Prova', $profile->getFullName());
        self::assertTrue($profile->isOnboardingCompleted());

        $staffMembership = $this->em->getRepository(StaffMember::class)->findOneBy([
            'profile' => $profile,
        ]);
        self::assertInstanceOf(StaffMember::class, $staffMembership);
        self::assertSame('barbiere-di-prova', $staffMembership->getTenant()->getSlug());
        self::assertSame('owner', $staffMembership->getRole());

        $this->client->jsonRequest('POST', '/api/login', [
            'email' => $email,
            'password' => $password,
        ]);

        self::assertResponseIsSuccessful();

        $loginPayload = $this->responsePayload();
        self::assertIsString($loginPayload['token'] ?? null);

        $this->client->request('GET', '/api/me', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$loginPayload['token'],
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $mePayload = $this->responsePayload();
        self::assertSame($email, $mePayload['user']['email'] ?? null);
        self::assertSame('Owner Barbiere Di Prova', $mePayload['profile']['fullName'] ?? null);
        self::assertSame('barbiere-di-prova', $mePayload['currentTenant']['tenant']['slug'] ?? null);
        self::assertSame('owner', $mePayload['currentRole'] ?? null);
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
