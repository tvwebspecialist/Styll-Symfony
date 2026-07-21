<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Client;
use App\Entity\MessageLog;
use App\Entity\MessageTemplate;
use App\Entity\MessagingOutbox;
use App\Entity\Profile;
use App\Entity\StaffMember;
use App\Entity\Tenant;
use App\Entity\User;
use App\EventListener\TenantFilterSubscriber;
use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

final class MessagingTenantIsolationIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private TokenStorageInterface $tokenStorage;
    private TenantContext $tenantContext;

    protected function setUp(): void
    {
        self::bootKernel();

        $container = self::getContainer();
        $this->em = $container->get(EntityManagerInterface::class);
        $this->tokenStorage = $container->get(TokenStorageInterface::class);
        $this->tenantContext = $container->get(TenantContext::class);

        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        $this->resetDatabase();
        $this->seedTwoTenants();
        $this->em->clear();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        parent::tearDown();
    }

    public function testTenantASeesOnlyOwnMessagingRows(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.messaging@example.test');

        self::assertSame(['Tenant A reminder'], $this->templateNames());
        self::assertSame(['tenant-a-message'], $this->messageLogTypes());
        self::assertSame(['tenant-a-outbox'], $this->outboxKeys());
    }

    public function testTenantBSeesOnlyOwnMessagingRows(): void
    {
        $this->authenticateAndEnableFilter('tenant-b.messaging@example.test');

        self::assertSame(['Tenant B reminder'], $this->templateNames());
        self::assertSame(['tenant-b-message'], $this->messageLogTypes());
        self::assertSame(['tenant-b-outbox'], $this->outboxKeys());
    }

    private function authenticateAndEnableFilter(string $email): void
    {
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        self::assertInstanceOf(User::class, $user);

        $this->tokenStorage->setToken(new UsernamePasswordToken($user, 'api', $user->getRoles()));
        $this->tenantContext->reset();
        $this->enableFilterForCurrentRequest();
    }

    private function enableFilterForCurrentRequest(): void
    {
        $subscriber = self::getContainer()->get(TenantFilterSubscriber::class);
        self::assertInstanceOf(TenantFilterSubscriber::class, $subscriber);

        $subscriber(new RequestEvent(
            self::$kernel,
            Request::create('/api/test-messaging-tenant-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function templateNames(): array
    {
        $templates = $this->em->getRepository(MessageTemplate::class)->findBy([], ['name' => 'ASC']);

        return array_map(static fn (MessageTemplate $template): string => $template->getName(), $templates);
    }

    /**
     * @return list<string>
     */
    private function messageLogTypes(): array
    {
        $logs = $this->em->getRepository(MessageLog::class)->findBy([], ['type' => 'ASC']);

        return array_map(static fn (MessageLog $log): string => $log->getType(), $logs);
    }

    /**
     * @return list<string>
     */
    private function outboxKeys(): array
    {
        $outboxRows = $this->em->getRepository(MessagingOutbox::class)->findBy([], ['idempotencyKey' => 'ASC']);

        return array_map(static fn (MessagingOutbox $outbox): string => $outbox->getIdempotencyKey(), $outboxRows);
    }

    private function seedTwoTenants(): void
    {
        $this->seedTenant('Tenant A', 'tenant-a-messaging', 'tenant-a.messaging@example.test', '+393330000001', 'tenant-a-message', 'tenant-a-outbox');
        $this->seedTenant('Tenant B', 'tenant-b-messaging', 'tenant-b.messaging@example.test', '+393330000002', 'tenant-b-message', 'tenant-b-outbox');

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail, string $clientPhone, string $messageType, string $outboxKey): void
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-2-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $client = (new Client())
            ->setTenant($tenant)
            ->setFullName($label.' Client')
            ->setPhone($clientPhone);

        $template = (new MessageTemplate())
            ->setTenant($tenant)
            ->setName($label.' reminder')
            ->setType(MessageTemplate::TYPE_REMINDER)
            ->setChannel(MessageTemplate::CHANNEL_SMS)
            ->setBody('Ciao {client_name}, ti aspettiamo domani.');

        $log = (new MessageLog())
            ->setTenant($tenant)
            ->setClient($client)
            ->setTemplate($template)
            ->setChannel(MessageLog::CHANNEL_SMS)
            ->setType($messageType)
            ->setRecipient($clientPhone)
            ->setBodySent('Reminder sent')
            ->setStatus(MessageLog::STATUS_SENT)
            ->setCostCents('8')
            ->setSentAt(new \DateTimeImmutable());

        $outbox = (new MessagingOutbox())
            ->setTenant($tenant)
            ->setClient($client)
            ->setTemplate($template)
            ->setMessageLog($log)
            ->setChannel(MessagingOutbox::CHANNEL_SMS)
            ->setPayload(['client_phone' => $clientPhone])
            ->setStatus(MessagingOutbox::STATUS_PENDING)
            ->setIdempotencyKey($outboxKey);

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);
        $this->em->persist($client);
        $this->em->persist($template);
        $this->em->persist($log);
        $this->em->persist($outbox);
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE users, tenants RESTART IDENTITY CASCADE',
        );
    }

    private function disableTenantFilter(): void
    {
        $filters = $this->em->getFilters();
        if ($filters->isEnabled('tenant_filter')) {
            $filters->disable('tenant_filter');
        }
    }
}
