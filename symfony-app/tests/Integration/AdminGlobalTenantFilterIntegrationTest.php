<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\AdminAuditLog;
use App\Entity\AdminSetting;
use App\Entity\EmailTemplate;
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

final class AdminGlobalTenantFilterIntegrationTest extends KernelTestCase
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
        $this->seedData();
        $this->em->clear();
    }

    protected function tearDown(): void
    {
        $this->disableTenantFilter();
        $this->tokenStorage->setToken(null);
        $this->tenantContext->reset();
        parent::tearDown();
    }

    public function testAdminGlobalTablesAreNotTenantFiltered(): void
    {
        $this->authenticateAndEnableFilter('tenant-a.admin-global@example.test');

        self::assertSame(['tenant-a-suspend', 'tenant-b-suspend'], $this->auditActions());
        self::assertSame(['feature_flags', 'maintenance'], $this->adminSettingKeys());
        self::assertSame(['reminder', 'welcome'], $this->emailTemplateSlugs());
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
            Request::create('/api/test-admin-global-filter'),
            HttpKernelInterface::MAIN_REQUEST,
        ));
    }

    /**
     * @return list<string>
     */
    private function auditActions(): array
    {
        $logs = $this->em->getRepository(AdminAuditLog::class)->findBy([], ['action' => 'ASC']);

        return array_map(static fn (AdminAuditLog $log): string => $log->getAction(), $logs);
    }

    /**
     * @return list<string>
     */
    private function adminSettingKeys(): array
    {
        $settings = $this->em->getRepository(AdminSetting::class)->findBy([], ['key' => 'ASC']);

        return array_map(static fn (AdminSetting $setting): string => $setting->getKey(), $settings);
    }

    /**
     * @return list<string>
     */
    private function emailTemplateSlugs(): array
    {
        $templates = $this->em->getRepository(EmailTemplate::class)->findBy([], ['slug' => 'ASC']);

        return array_map(static fn (EmailTemplate $template): string => $template->getSlug(), $templates);
    }

    private function seedData(): void
    {
        $tenantA = $this->seedTenant('Tenant A', 'tenant-a-admin-global', 'tenant-a.admin-global@example.test');
        $tenantB = $this->seedTenant('Tenant B', 'tenant-b-admin-global', 'tenant-b.admin-global@example.test');

        $this->em->persist((new AdminAuditLog())
            ->setTenant($tenantA)
            ->setAction('tenant-a-suspend')
            ->setEntityType('tenant')
            ->setEntityId((string) $tenantA->getId()));

        $this->em->persist((new AdminAuditLog())
            ->setTenant($tenantB)
            ->setAction('tenant-b-suspend')
            ->setEntityType('tenant')
            ->setEntityId((string) $tenantB->getId()));

        $this->em->persist((new AdminSetting())->setKey('feature_flags')->setValue(['gamification' => false]));
        $this->em->persist((new AdminSetting())->setKey('maintenance')->setValue(['enabled' => false]));

        $this->em->persist((new EmailTemplate())
            ->setSlug('welcome')
            ->setName('Welcome')
            ->setSubject('Welcome')
            ->setBody('Welcome body')
            ->setVariables(['full_name']));

        $this->em->persist((new EmailTemplate())
            ->setSlug('reminder')
            ->setName('Reminder')
            ->setSubject('Reminder')
            ->setBody('Reminder body')
            ->setVariables(['date']));

        $this->em->flush();
    }

    private function seedTenant(string $label, string $slug, string $staffEmail): Tenant
    {
        $tenant = (new Tenant())
            ->setBusinessName($label.' Barber')
            ->setSlug($slug);

        $user = (new User())
            ->setEmail($staffEmail)
            ->setPassword('phase-4-placeholder-not-used')
            ->setRoles(['ROLE_STAFF']);

        $profile = (new Profile($user))
            ->setFullName($label.' Staff');

        $staff = (new StaffMember())
            ->setTenant($tenant)
            ->setProfile($profile)
            ->setRole('owner');

        $this->em->persist($tenant);
        $this->em->persist($user);
        $this->em->persist($profile);
        $this->em->persist($staff);

        return $tenant;
    }

    private function resetDatabase(): void
    {
        $this->em->getConnection()->executeStatement(
            'TRUNCATE TABLE admin_audit_log, admin_settings, email_templates, users, tenants RESTART IDENTITY CASCADE',
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
