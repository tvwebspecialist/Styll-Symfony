<?php

declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class CorsSubscriber
{
    private const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    private const ALLOWED_HEADERS = 'Authorization, Content-Type, Accept';
    private const MAX_AGE = '3600';

    /**
     * @var list<string>
     */
    private array $allowedOrigins;

    public function __construct(string $corsAllowOrigin = '')
    {
        $this->allowedOrigins = array_values(array_filter(
            array_map('trim', explode(',', $corsAllowOrigin)),
            static fn (string $origin): bool => $origin !== '',
        ));
    }

    #[AsEventListener(event: KernelEvents::REQUEST, priority: 2048)]
    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $origin = $request->headers->get('Origin');

        if ($origin === null || !$this->isAllowedOrigin($origin) || $request->getMethod() !== 'OPTIONS') {
            return;
        }

        $response = new Response('', Response::HTTP_NO_CONTENT);
        $this->addCorsHeaders($response, $origin);

        $event->setResponse($response);
    }

    #[AsEventListener(event: KernelEvents::RESPONSE)]
    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $origin = $event->getRequest()->headers->get('Origin');

        if ($origin === null || !$this->isAllowedOrigin($origin)) {
            return;
        }

        $this->addCorsHeaders($event->getResponse(), $origin);
    }

    private function isAllowedOrigin(string $origin): bool
    {
        return in_array($origin, $this->allowedOrigins, true);
    }

    private function addCorsHeaders(Response $response, string $origin): void
    {
        $headers = $response->headers;
        $headers->set('Access-Control-Allow-Origin', $origin);
        $headers->set('Access-Control-Allow-Methods', self::ALLOWED_METHODS);
        $headers->set('Access-Control-Allow-Headers', self::ALLOWED_HEADERS);
        $headers->set('Access-Control-Max-Age', self::MAX_AGE);
        $response->setVary(array_values(array_unique([...$response->getVary(), 'Origin'])));
    }
}
