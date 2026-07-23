<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Profile;
use App\Entity\User;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class AdminImageUploadControllerTest extends WebTestCase
{
    private const TEST_PREFIX = 'phase-b-tests';

    private KernelBrowser $client;
    private EntityManagerInterface $em;

    /**
     * @var array{tenantA: \App\Entity\Tenant, tenantB: \App\Entity\Tenant, userA: User, userB: User}
     */
    private array $seed;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $this->seed = $fixture->seedTwoTenantsWithClients();
        $this->em = $container->get(EntityManagerInterface::class);

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
        $this->cleanupUploads();
    }

    protected function tearDown(): void
    {
        $this->cleanupUploads();
        parent::tearDown();
    }

    public function testUploadRejectsNormalStaff(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);

        $this->client->request('POST', '/api/admin/uploads/image', server: [
            'HTTP_AUTHORIZATION' => 'Bearer '.$token,
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(403);
    }

    public function testSuperadminCanUploadImageAndReceivePublicUrl(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $upload = $this->createImageUpload();

        $this->client->request(
            'POST',
            '/api/admin/uploads/image',
            [
                'bucket' => 'tenants',
                'pathPrefix' => self::TEST_PREFIX,
            ],
            [
                'file' => $upload,
            ],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$token,
                'HTTP_ACCEPT' => 'application/json',
            ],
        );

        self::assertResponseStatusCodeSame(201);
        $payload = $this->responsePayload();
        self::assertIsString($payload['url'] ?? null);
        self::assertStringContainsString('/uploads/admin/tenants/'.self::TEST_PREFIX.'/', $payload['url']);

        $path = parse_url((string) $payload['url'], \PHP_URL_PATH);
        self::assertIsString($path);
        self::assertFileExists(dirname(__DIR__, 2).'/public'.$path);
    }

    public function testSuperadminUploadRejectsTooLargeImage(): void
    {
        $this->promoteToSuperadmin($this->seed['userA']);
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $upload = $this->createImageUpload(1100000);

        $this->client->request(
            'POST',
            '/api/admin/uploads/image',
            [
                'bucket' => 'tenants',
                'pathPrefix' => self::TEST_PREFIX,
            ],
            [
                'file' => $upload,
            ],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$token,
                'HTTP_ACCEPT' => 'application/json',
            ],
        );

        self::assertResponseStatusCodeSame(400);
        $payload = $this->responsePayload();
        self::assertSame('File troppo grande (max 1 MB dopo compressione).', $payload['error'] ?? null);
    }

    private function createImageUpload(int $targetBytes = 0): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5YucsAAAAASUVORK5CYII=',
            true,
        );
        self::assertIsString($png);

        if ($targetBytes > strlen($png)) {
            $png .= str_repeat("\0", $targetBytes - strlen($png));
        }

        $tmp = tempnam(sys_get_temp_dir(), 'admin-upload-test-');
        self::assertIsString($tmp);
        file_put_contents($tmp, $png);

        return new UploadedFile($tmp, 'test-upload.png', 'image/png', null, true);
    }

    private function cleanupUploads(): void
    {
        $target = dirname(__DIR__, 2).'/public/uploads/admin/tenants/'.self::TEST_PREFIX;
        if (!is_dir($target)) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($target, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );

        foreach ($it as $file) {
            if ($file->isDir()) {
                rmdir($file->getPathname());
                continue;
            }

            unlink($file->getPathname());
        }

        rmdir($target);
    }

    private function promoteToSuperadmin(User $user): void
    {
        $managedUser = $this->em->getRepository(User::class)->find($user->getId());
        self::assertInstanceOf(User::class, $managedUser);

        $profile = $this->em->getRepository(Profile::class)->find($user->getId());
        self::assertInstanceOf(Profile::class, $profile);

        $managedUser->setRoles(['ROLE_STAFF', 'ROLE_SUPERADMIN']);
        $profile->setIsSuperadmin(true);
        $profile->setEmail($managedUser->getEmail());

        $this->em->flush();
        $this->em->clear();
    }

    private function login(string $email): string
    {
        $this->client->jsonRequest('POST', '/api/login', [
            'email' => $email,
            'password' => TestTenantFixture::PASSWORD,
        ]);

        self::assertResponseIsSuccessful();
        $payload = $this->responsePayload();
        self::assertIsString($payload['token'] ?? null);

        return $payload['token'];
    }

    /**
     * @return array<string, mixed>|list<mixed>
     */
    private function responsePayload(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }
}
