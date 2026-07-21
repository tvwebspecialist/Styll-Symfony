<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CorsSubscriberTest extends WebTestCase
{
    protected function setUp(): void
    {
        $_ENV['CORS_ALLOW_ORIGIN'] = 'https://styll.it,https://www.styll.it,http://localhost:3000';
        $_SERVER['CORS_ALLOW_ORIGIN'] = $_ENV['CORS_ALLOW_ORIGIN'];
    }

    public function testPreflightForAllowedOriginReturnsCorsHeaders(): void
    {
        $client = self::createClient();

        $client->request('OPTIONS', '/api/clients', server: [
            'HTTP_ORIGIN' => 'https://styll.it',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Authorization, Content-Type',
        ]);

        self::assertResponseStatusCodeSame(204);
        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'https://styll.it');
        self::assertResponseHeaderSame('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        self::assertResponseHeaderSame('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    }

    public function testDisallowedOriginDoesNotReceiveCorsHeaders(): void
    {
        $client = self::createClient();

        $client->request('OPTIONS', '/api/clients', server: [
            'HTTP_ORIGIN' => 'https://malicious.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);

        self::assertFalse($client->getResponse()->headers->has('Access-Control-Allow-Origin'));
    }
}
