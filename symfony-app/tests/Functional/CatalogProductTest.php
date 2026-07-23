<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Fase 2c — Catalogo: Prodotti, Inventario, Vendita prodotti in appuntamento.
 *
 * Endpoint coperti:
 *   GET/POST/PATCH/DELETE  /api/products
 *   GET/PATCH              /api/product-inventory
 *   POST                   /api/appointments/{id}/products
 *
 * Test chiave: aggiungere un prodotto a un appuntamento decrementa product_inventory
 * via trigger DB trg_decrement_inventory (verifica effetto reale, non assunto).
 */
final class CatalogProductTest extends WebTestCase
{
    private KernelBrowser $browser;
    private array $seed;

    protected function setUp(): void
    {
        $this->browser = self::createClient();

        $container = self::getContainer();
        $fixture   = $container->get(TestTenantFixture::class);
        self::assertInstanceOf(TestTenantFixture::class, $fixture);

        $fixture->resetDatabase();
        $this->seed = $fixture->seedTwoTenantsWithCatalogData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── Products ─────────────────────────────────────────────────────────────

    public function testListProductsRequiresAuth(): void
    {
        $this->browser->jsonRequest('GET', '/api/products');
        self::assertResponseStatusCodeSame(401);
    }

    public function testListProductsReturnsTenantData(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('GET', '/api/products', [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data  = $this->json();
        $names = array_column($data, 'name');
        self::assertContains('Gel capelli', $names);
        self::assertContains('Prodotto dismesso', $names);
    }

    public function testListProductsIsolatedPerTenant(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $this->browser->jsonRequest('GET', '/api/products', [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $names = array_column($this->json(), 'name');
        self::assertNotContains('Gel capelli', $names, 'Tenant B non deve vedere i prodotti di Tenant A');
        self::assertContains('Prodotto Tenant B', $names);
    }

    public function testListProductsIncludesInventorySummary(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('GET', '/api/products', [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $products  = $this->json();
        $gelEntry  = null;
        foreach ($products as $p) {
            if ($p['name'] === 'Gel capelli') {
                $gelEntry = $p;
                break;
            }
        }
        self::assertNotNull($gelEntry);
        self::assertSame(10, $gelEntry['totalStock']);
        // qty=10 <= threshold=5 → isLowStock=false (10 > 5)
        self::assertFalse($gelEntry['isLowStock']);
        self::assertNotEmpty($gelEntry['inventory']);
        self::assertSame(10, $gelEntry['inventory'][0]['quantity']);
    }

    public function testCreateProductSucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('POST', '/api/products', [
            'name'      => 'Shampoo Pro',
            'priceSell' => '18.50',
            'brand'     => 'BarberCo',
            'isActive'  => true,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame('Shampoo Pro', $data['name']);
        self::assertSame('18.50', $data['priceSell']);
        self::assertSame('BarberCo', $data['brand']);
        self::assertArrayHasKey('inventory', $data);
        // Auto-init: inventory created for locationA (active location in tenantA from booking seed)
        self::assertNotEmpty($data['inventory'], 'Inventory auto-init per location attiva atteso');
        self::assertSame(0, $data['inventory'][0]['quantity']);
    }

    public function testCreateProductAutoInitInventoryForActiveLocations(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('POST', '/api/products', [
            'name'      => 'Prodotto Auto-Init',
            'priceSell' => '9.99',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();

        $conn  = self::getContainer()->get(Connection::class);
        $count = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM product_inventory WHERE product_id = ?',
            [$data['id']],
        );
        self::assertGreaterThanOrEqual(1, $count, 'Almeno 1 riga inventory auto-inizializzata per le location attive');
    }

    public function testCreateProductMissingNameReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('POST', '/api/products', [
            'priceSell' => '10.00',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testUpdateProductSucceeds(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/products/$productId", [
            'name'     => 'Gel capelli Pro',
            'isActive' => false,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame('Gel capelli Pro', $data['name']);
        self::assertFalse($data['isActive']);
    }

    public function testUpdateProductCrossTenantReturns404(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/products/$productId", [
            'name' => 'Tentativo cross-tenant',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testDeleteProductSucceeds(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $productId = (string) $this->seed['productInactive']->getId();

        // productInactive non ha appointment_products → cancellazione fisica OK
        $this->browser->jsonRequest('DELETE', "/api/products/$productId", server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(204);
    }

    public function testDeleteProductCrossTenantReturns404(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('DELETE', "/api/products/$productId", server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(404);
    }

    // ─── Product Inventory ────────────────────────────────────────────────────

    public function testListInventoryRequiresAuth(): void
    {
        $this->browser->jsonRequest('GET', '/api/product-inventory');
        self::assertResponseStatusCodeSame(401);
    }

    public function testListInventoryReturnsTenantData(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('GET', '/api/product-inventory', [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $entries  = $this->json();
        $prodNames = array_column($entries, 'productName');
        self::assertContains('Gel capelli', $prodNames);
    }

    public function testListInventoryFilterByLocation(): void
    {
        $token      = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $locationId = (string) $this->seed['locationA']->getId();

        $this->browser->jsonRequest('GET', "/api/product-inventory?locationId=$locationId", [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $entries = $this->json();
        foreach ($entries as $entry) {
            self::assertSame($locationId, $entry['locationId'], 'Ogni entry filtrata deve appartenere alla location richiesta');
        }
    }

    public function testListInventoryIsolatedPerTenant(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $this->browser->jsonRequest('GET', '/api/product-inventory', [], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $prodNames = array_column($this->json(), 'productName');
        self::assertNotContains('Gel capelli', $prodNames, 'Tenant B non deve vedere inventory di Tenant A');
    }

    public function testUpdateInventoryQuantitySucceeds(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $invId = (string) $this->seed['inventoryA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/product-inventory/$invId", [
            'quantity'          => 25,
            'lowStockThreshold' => 8,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        $data = $this->json();
        self::assertSame(25, $data['quantity']);
        self::assertSame(8, $data['lowStockThreshold']);
        self::assertFalse($data['isLowStock']); // 25 > 8
    }

    public function testUpdateInventoryNegativeQuantityReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $invId = (string) $this->seed['inventoryA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/product-inventory/$invId", [
            'quantity' => -5,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testUpdateInventoryCrossTenantReturns404(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_B_EMAIL);
        $invId = (string) $this->seed['inventoryA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/product-inventory/$invId", [
            'quantity' => 99,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testInventoryLowStockFlagCalculated(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $invId = (string) $this->seed['inventoryA']->getId();

        // Imposta qty=3 con threshold=5 → isLowStock=true (3 <= 5)
        $this->browser->jsonRequest('PATCH', "/api/product-inventory/$invId", [
            'quantity'          => 3,
            'lowStockThreshold' => 5,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseIsSuccessful();
        self::assertTrue($this->json()['isLowStock'], 'qty=3 <= threshold=5 deve risultare isLowStock=true');
    }

    // ─── Appointment Products (trigger DB) ────────────────────────────────────

    public function testAddProductToAppointmentRequiresAuth(): void
    {
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 1,
        ]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testAddProductToAppointmentDecrementsInventory(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productA']->getId();

        $conn = self::getContainer()->get(Connection::class);

        $qtyBefore = (int) $conn->fetchOne(
            'SELECT quantity FROM product_inventory WHERE id = ?',
            [(string) $this->seed['inventoryA']->getId()],
        );
        self::assertSame(10, $qtyBefore, 'La quantità iniziale deve essere 10');

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 2,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame($productId, $data['productId']);
        self::assertSame(2, $data['quantity']);
        self::assertSame('12.00', $data['priceAtSale']); // snapshot prezzo

        // Il trigger DB trg_decrement_inventory deve aver decrementato quantity di 2
        $qtyAfter = (int) $conn->fetchOne(
            'SELECT quantity FROM product_inventory WHERE id = ?',
            [(string) $this->seed['inventoryA']->getId()],
        );
        self::assertSame(8, $qtyAfter, 'Il trigger DB deve aver decrementato la quantità di 2 (10 → 8)');
    }

    public function testAddProductToAppointmentQuantityGreaterThanOne(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 5,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);

        $conn     = self::getContainer()->get(Connection::class);
        $qtyAfter = (int) $conn->fetchOne(
            'SELECT quantity FROM product_inventory WHERE id = ?',
            [(string) $this->seed['inventoryA']->getId()],
        );
        self::assertSame(5, $qtyAfter, '10 - 5 = 5 dopo il trigger');
    }

    public function testAddInactiveProductToAppointmentReturns422(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productInactive']->getId();

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 1,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('PRODUCT_NOT_AVAILABLE', $this->json()['code']);
    }

    public function testAddCrossTenantProductToAppointmentReturns422(): void
    {
        // TenantA cerca di usare productB (appartiene a TenantB)
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productB']->getId();

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 1,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('PRODUCT_NOT_AVAILABLE', $this->json()['code']);
    }

    public function testAddProductToNonExistentAppointmentReturns404(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('POST', '/api/appointments/00000000-0000-0000-0000-000000000000/products', [
            'productId' => $productId,
            'quantity'  => 1,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(404);
    }

    public function testAddProductToAppointmentInvalidQuantityReturns422(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productA']->getId();

        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 0,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testAddProductPriceSnapshotIsIndependentFromSubsequentPriceChange(): void
    {
        $token     = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $apptId    = (string) $this->seed['appointmentA']->getId();
        $productId = (string) $this->seed['productA']->getId();

        // Add product (price=12.00 at seed time)
        $this->browser->jsonRequest('POST', "/api/appointments/$apptId/products", [
            'productId' => $productId,
            'quantity'  => 1,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);
        self::assertResponseStatusCodeSame(201);
        $priceAtSale = $this->json()['priceAtSale'];

        // Change product price
        $this->browser->jsonRequest('PATCH', "/api/products/$productId", [
            'priceSell' => '99.99',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        // price_at_sale in appointment_products must remain the original snapshot
        $conn           = self::getContainer()->get(Connection::class);
        $savedPriceAtSale = $conn->fetchOne(
            'SELECT price_at_sale FROM appointment_products WHERE appointment_id = ? AND product_id = ?',
            [(string) $this->seed['appointmentA']->getId(), $productId],
        );
        self::assertSame($priceAtSale, $savedPriceAtSale, 'price_at_sale deve rimanere il snapshot al momento della vendita');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function login(string $email): string
    {
        $this->browser->jsonRequest('POST', '/api/login', [
            'email'    => $email,
            'password' => TestTenantFixture::PASSWORD,
        ]);
        self::assertResponseIsSuccessful();
        $payload = $this->json();
        self::assertArrayHasKey('token', $payload);

        return (string) $payload['token'];
    }

    /** @return array<mixed> */
    private function json(): array
    {
        $content = $this->browser->getResponse()->getContent();
        $decoded = json_decode((string) $content, true, 512, \JSON_THROW_ON_ERROR);
        self::assertIsArray($decoded);

        return $decoded;
    }
}
