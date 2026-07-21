<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class PublicTenantResourcesEndpointTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = self::createClient();

        $container = self::getContainer();
        $fixture = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $fixture->seedTwoTenantsWithPublicLandingData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    public function testPublicTenantResourceDoesNotRequireJwtAndExposesOnlyPublicFields(): void
    {
        $this->client->request('GET', '/api/public/tenants/tenant-a-api', server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->jsonResponse();
        self::assertSame('Tenant A API Barber', $payload['businessName'] ?? null);
        self::assertSame('tenant-a-api', $payload['slug'] ?? null);
        self::assertSame('Tenant A Public Tagline', $payload['tagline'] ?? null);
        self::assertSame('Tenant A Public Hero Description', $payload['description'] ?? null);
        self::assertSame('https://cdn.example.test/tenant-a-public/hero.jpg', $payload['heroImageUrl'] ?? null);
        self::assertSame('Tenant A Public About Title', $payload['aboutTitle'] ?? null);
        self::assertSame('Tenant A Public About Text', $payload['aboutText'] ?? null);
        self::assertSame('https://cdn.example.test/tenant-a-public/about.jpg', $payload['aboutImageUrl'] ?? null);
        self::assertSame(4.8, $payload['googleRating'] ?? null);
        self::assertSame(143, $payload['googleReviewsCount'] ?? null);
        self::assertSame('Tenant A Public Team Description', $payload['teamDescription'] ?? null);
        self::assertSame('Tenant A Public Locations Description', $payload['locationsDescription'] ?? null);
        self::assertSame('+3902000000', $payload['contactPhone'] ?? null);
        self::assertSame('tenant-a-public@example.test', $payload['contactEmail'] ?? null);
        self::assertSame('https://instagram.com/tenant-a-public', $payload['socialLinks']['instagram'] ?? null);
        self::assertSensitiveKeysAreAbsent($payload, ['settings', 'featureFlagOverrides', 'status', 'dataRegion', 'createdAt', 'updatedAt']);
    }

    public function testPublicLandingCollectionsFilterOutHiddenRecords(): void
    {
        foreach ([
            ['locations', 'Tenant A Public Location', 'Tenant A Public Hidden Location'],
            ['services', 'Tenant A Public Service', 'Tenant A Public Hidden Service'],
            ['staff-members', 'Tenant A Public Barber', 'Tenant A Public Hidden Barber'],
            ['products', 'Tenant A Public Product', 'Tenant A Public Hidden Product'],
        ] as [$path, $visibleMarker, $hiddenMarker]) {
            $this->client->request('GET', '/api/public/tenants/tenant-a-api/'.$path, server: [
                'HTTP_ACCEPT' => 'application/json',
            ]);

            self::assertResponseIsSuccessful();

            $encoded = $this->client->getResponse()->getContent();
            self::assertIsString($encoded);
            self::assertStringContainsString($visibleMarker, $encoded);
            self::assertStringNotContainsString($hiddenMarker, $encoded);
        }
    }

    public function testLandingSpecificPublicFieldsAreExposedOnCollections(): void
    {
        $location = $this->firstCollectionItem('/api/public/tenants/tenant-a-api/locations');
        self::assertSame('https://cdn.example.test/tenant-a-public/location-cover.jpg', $location['photoUrl'] ?? null);
        self::assertSame([
            'https://cdn.example.test/tenant-a-public/location-1.jpg',
            'https://cdn.example.test/tenant-a-public/location-2.jpg',
        ], $location['photos'] ?? null);

        $staffMember = $this->firstCollectionItem('/api/public/tenants/tenant-a-api/staff-members');
        self::assertSame('manager', $staffMember['role'] ?? null);
        self::assertSame('Tenant A Public Barber', $staffMember['fullName'] ?? null);
        self::assertSame('https://cdn.example.test/tenant-a-public/staff.jpg', $staffMember['photoUrl'] ?? null);

        $product = $this->firstCollectionItem('/api/public/tenants/tenant-a-api/products');
        self::assertSame('Tenant A Public Brand', $product['brand'] ?? null);
        self::assertSame('Tenant A Public Product Description', $product['description'] ?? null);
        self::assertSame('Care', $product['category'] ?? null);
        self::assertSame('https://cdn.example.test/tenant-a-public/product.jpg', $product['photoUrl'] ?? null);
        self::assertTrue($product['available'] ?? false);
    }

    /**
     * @dataProvider collectionEndpointProvider
     */
    public function testPublicCollectionsDoNotRequireJwtAndAreScopedToSlug(string $path): void
    {
        $this->client->request('GET', '/api/public/tenants/tenant-a-api/'.$path, server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $encoded = $this->client->getResponse()->getContent();
        self::assertIsString($encoded);

        if ($path === 'tenant') {
            self::assertStringContainsString('Tenant A API Barber', $encoded);
            self::assertStringNotContainsString('Tenant B API Barber', $encoded);
            return;
        }

        if (in_array($path, ['portfolio-photos', 'website-photos'], true)) {
            self::assertStringContainsString('tenant-a-public', $encoded);
            self::assertStringNotContainsString('tenant-b-public', $encoded);
            return;
        }

        self::assertStringContainsString('Tenant A Public', $encoded);
        self::assertStringNotContainsString('Tenant B Public', $encoded);
    }

    /**
     * @dataProvider itemEndpointProvider
     *
     * @param list<string> $sensitiveKeys
     */
    public function testPublicItemsExposeOnlyPublicFields(string $path, array $sensitiveKeys): void
    {
        $tenantAItem = $this->firstCollectionItem('/api/public/tenants/tenant-a-api/'.$path);
        self::assertArrayHasKey('id', $tenantAItem);
        self::assertIsString($tenantAItem['id']);

        $this->client->request('GET', '/api/public/tenants/tenant-a-api/'.$path.'/'.$tenantAItem['id'], server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        self::assertSensitiveKeysAreAbsent($this->jsonResponse(), $sensitiveKeys);
    }

    /**
     * @dataProvider itemEndpointProvider
     *
     * @param list<string> $_sensitiveKeys
     */
    public function testPublicItemsCannotBeReadAcrossTenantSlugs(string $path, array $_sensitiveKeys): void
    {
        $tenantBItem = $this->firstCollectionItem('/api/public/tenants/tenant-b-api/'.$path);
        self::assertArrayHasKey('id', $tenantBItem);
        self::assertIsString($tenantBItem['id']);

        $this->client->request('GET', '/api/public/tenants/tenant-a-api/'.$path.'/'.$tenantBItem['id'], server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(404);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function collectionEndpointProvider(): iterable
    {
        yield 'tenant collection is scoped to one slug' => ['tenant'];
        yield 'locations' => ['locations'];
        yield 'service categories' => ['service-categories'];
        yield 'services' => ['services'];
        yield 'staff members' => ['staff-members'];
        yield 'products' => ['products'];
        yield 'gallery photos' => ['gallery-photos'];
        yield 'portfolio photos' => ['portfolio-photos'];
        yield 'website photos' => ['website-photos'];
        yield 'promotions' => ['promotions'];
        yield 'promotion services' => ['promotion-services'];
        yield 'promotion products' => ['promotion-products'];
    }

    /**
     * @return iterable<string, array{string, list<string>}>
     */
    public static function itemEndpointProvider(): iterable
    {
        yield 'locations' => ['locations', ['tenant', 'showOnWebsite', 'isActive', 'createdAt', 'updatedAt']];
        yield 'service categories' => ['service-categories', ['tenant', 'createdAt']];
        yield 'services' => ['services', ['tenant', 'showOnWebsite', 'isActive', 'createdBy', 'createdAt', 'updatedAt']];
        yield 'staff members' => ['staff-members', ['tenant', 'profile', 'showOnWebsite', 'notificationPreferences', 'phone', 'email', 'createdBy', 'deletedBy', 'deletedAt', 'createdAt', 'updatedAt']];
        yield 'products' => ['products', ['tenant', 'displayOrder', 'showOnSite', 'priceCost', 'sku', 'createdBy', 'createdAt', 'updatedAt']];
        yield 'gallery photos' => ['gallery-photos', ['tenant', 'createdAt', 'isActive']];
        yield 'portfolio photos' => ['portfolio-photos', ['tenant', 'staff', 'createdAt', 'isVisible']];
        yield 'website photos' => ['website-photos', ['tenant', 'createdAt']];
        yield 'promotions' => ['promotions', ['tenant', 'service', 'showOnLanding', 'showInApp', 'isActive', 'createdAt', 'updatedAt']];
        yield 'promotion services' => ['promotion-services', ['tenant', 'createdAt']];
        yield 'promotion products' => ['promotion-products', ['tenant', 'createdAt']];
    }

    /**
     * @return array<string, mixed>
     */
    private function firstCollectionItem(string $path): array
    {
        $this->client->request('GET', $path, server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();

        $payload = $this->jsonResponse();
        $items = $payload['member'] ?? $payload['hydra:member'] ?? $payload;

        self::assertIsArray($items);
        self::assertNotEmpty($items);
        self::assertIsArray($items[0]);

        return $items[0];
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonResponse(): array
    {
        $payload = json_decode($this->client->getResponse()->getContent(), true, flags: \JSON_THROW_ON_ERROR);
        self::assertIsArray($payload);

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @param list<string>         $sensitiveKeys
     */
    private static function assertSensitiveKeysAreAbsent(array $payload, array $sensitiveKeys): void
    {
        foreach ($payload as $key => $value) {
            self::assertNotContains($key, $sensitiveKeys, sprintf('Sensitive key "%s" was exposed.', $key));

            if (is_array($value)) {
                self::assertSensitiveKeysAreAbsent($value, $sensitiveKeys);
            }
        }
    }
}
