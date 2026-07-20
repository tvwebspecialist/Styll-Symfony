<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Security\TenantContext;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Enables the Doctrine TenantFilter on every authenticated request.
 *
 * Runs after the Symfony firewall (which validates the JWT and sets the
 * security token), so TenantContext can resolve the tenant_id from the
 * authenticated user.
 *
 * Priority: 0 (after firewall at priority 8).
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 0)]
final class TenantFilterSubscriber
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TenantContext $tenantContext,
    ) {}

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $tenantId = $this->tenantContext->getTenantId();

        if ($tenantId === null) {
            // Unauthenticated or admin request — do NOT enable the filter.
            // Unauthenticated API routes are protected by access_control in security.yaml.
            return;
        }

        $filter = $this->em->getFilters()->enable('tenant_filter');
        $filter->setParameter('tenant_id', (string) $tenantId, 'uuid');
    }
}
