<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Appointment;
use App\Entity\Client;
use App\Entity\ClientLoyalty;
use App\Entity\LoyaltyConfig;
use App\Entity\LoyaltyTransaction;
use App\Security\TenantContext;
use App\Tests\Support\TestTenantFixture;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Fase 2b — Loyalty SCRITTURA (v1 classico).
 *
 * Endpoint coperti:
 *   PATCH  /api/appointments/{id}/status          → listener loyalty su 'completed'
 *   POST   /api/clients/{id}/loyalty/adjust       → aggiustamento manuale punti
 *   POST   /api/clients/{id}/reward-redemptions   → riscatto immediato reward
 *
 * Invarianti verificate:
 *   - Punti assegnati automaticamente su completamento (template classic)
 *   - Idempotenza doppio completamento (unique index idempotente)
 *   - Resilienza: HTTP 200 anche se loyalty genera eccezione interna
 *   - Template non-classic → nessun punto assegnato
 *   - Adjust positivo crea punti, adjust negativo oltre soglia → 422
 *   - Redemption decrementa solo available_points (non total_points)
 *   - Isolamento cross-tenant su tutti gli endpoint
 */
final class LoyaltyWriteTest extends WebTestCase
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
        $this->seed = $fixture->seedTwoTenantsWithLoyaltyWriteData();

        $container->get(TokenStorageInterface::class)->setToken(null);
        $container->get(TenantContext::class)->reset();
    }

    // ─── Listener: punti su completamento ────────────────────────────────────

    public function testEarnPointsOnCompletion(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(200);
        self::assertSame('completed', $this->json()['status']);

        $conn = self::getContainer()->get(Connection::class);

        $earnCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM loyalty_transactions WHERE appointment_id = ? AND type = ?',
            [$id, 'earn'],
        );
        self::assertSame(1, $earnCount, 'Deve esistere esattamente 1 earn transaction per l\'appuntamento');

        $loyalty = $conn->fetchAssociative(
            'SELECT total_points, available_points FROM client_loyalty WHERE client_id = ?',
            [(string) $this->seed['clientA']->getId()],
        );
        self::assertIsArray($loyalty);
        self::assertSame(100, (int) $loyalty['total_points']);
        self::assertSame(100, (int) $loyalty['available_points']);
    }

    public function testEarnPointsCreatesClientLoyaltyIfMissing(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $conn = self::getContainer()->get(Connection::class);
        $beforeCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM client_loyalty WHERE client_id = ?',
            [(string) $this->seed['clientA']->getId()],
        );
        self::assertSame(0, $beforeCount, 'clientA non deve avere ClientLoyalty prima del completamento');

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(200);

        $afterCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM client_loyalty WHERE client_id = ?',
            [(string) $this->seed['clientA']->getId()],
        );
        self::assertSame(1, $afterCount, 'ClientLoyalty deve essere creata dal listener');
    }

    public function testDoubleCompletionIdempotent(): void
    {
        // Simula un "già processato": pre-inserisce earn + ClientLoyalty per appointmentA
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');

        $tenantA = $this->seed['tenantA'];
        $clientA = $this->seed['clientA'];
        $apptA   = $this->seed['appointmentA'];

        $loyalty = (new ClientLoyalty())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setTotalPoints(100)
            ->setAvailablePoints(100);
        $em->persist($loyalty);

        $existingEarn = (new LoyaltyTransaction())
            ->setTenant($tenantA)
            ->setClient($clientA)
            ->setType(LoyaltyTransaction::TYPE_EARN)
            ->setPoints(100)
            ->setDescription('Pre-seeded earn')
            ->setAppointment($apptA);
        $em->persist($existingEarn);
        $em->flush();
        $em->clear();

        $conn = $container->get(Connection::class);
        $id   = (string) $apptA->getId();

        // Completa l'appuntamento — il listener tenterà di inserire un secondo earn
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        // HTTP 200: il cambio di stato non deve fallire
        self::assertResponseStatusCodeSame(200, 'La status change deve avere successo anche con earn duplicato');
        self::assertSame('completed', $this->json()['status']);

        // Ancora 1 sola earn transaction (la seconda è stata bloccata dall'unique index)
        $earnCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM loyalty_transactions WHERE appointment_id = ? AND type = ?',
            [$id, 'earn'],
        );
        self::assertSame(1, $earnCount, 'Non devono esserci earn duplicate per lo stesso appuntamento');

        // I punti non devono essere raddoppiati
        $pts = $conn->fetchAssociative(
            'SELECT total_points, available_points FROM client_loyalty WHERE client_id = ?',
            [(string) $clientA->getId()],
        );
        self::assertIsArray($pts);
        self::assertSame(100, (int) $pts['total_points'], 'total_points non deve essere duplicato');
        self::assertSame(100, (int) $pts['available_points'], 'available_points non deve essere duplicato');
    }

    public function testNonClassicTemplateAssignsNoPoints(): void
    {
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');

        // Chiude il config classic (ended_at=now): il partial unique index permette ora di inserirne un altro
        $em->createQuery('UPDATE App\Entity\LoyaltyConfig c SET c.endedAt = :now WHERE c.tenant = :t')
            ->setParameter('now', new \DateTimeImmutable())
            ->setParameter('t', $this->seed['tenantA'])
            ->execute();

        // Aggiunge config streak_master
        $streakConfig = (new LoyaltyConfig())
            ->setTenant($this->seed['tenantA'])
            ->setTemplate(LoyaltyConfig::TEMPLATE_STREAK_MASTER)
            ->setIsActive(true)
            ->setPointsPerVisit(null)
            ->setVersion(1);
        $em->persist($streakConfig);
        $em->flush();
        $em->clear();

        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(200);

        $conn      = $container->get(Connection::class);
        $earnCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM loyalty_transactions WHERE appointment_id = ? AND type = ?',
            [$id, 'earn'],
        );
        self::assertSame(0, $earnCount, 'Template non-classic non deve assegnare punti');

        $loyaltyCount = (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM client_loyalty WHERE client_id = ?',
            [(string) $this->seed['clientA']->getId()],
        );
        self::assertSame(0, $loyaltyCount, 'ClientLoyalty non deve essere creata per template non-classic');
    }

    public function testNoLoyaltyConfigAssignsNoPoints(): void
    {
        // Disattiva tutti i config del tenantA
        $em = self::getContainer()->get('doctrine.orm.entity_manager');
        $em->createQuery('UPDATE App\Entity\LoyaltyConfig c SET c.isActive = false WHERE c.tenant = :t')
            ->setParameter('t', $this->seed['tenantA'])
            ->execute();
        $em->clear();

        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['appointmentA']->getId();

        $this->browser->jsonRequest('PATCH', "/api/appointments/$id/status", [
            'status' => 'completed',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(200);

        $conn = self::getContainer()->get(Connection::class);
        self::assertSame(0, (int) $conn->fetchOne(
            'SELECT COUNT(*) FROM loyalty_transactions WHERE appointment_id = ?',
            [(string) $this->seed['appointmentA']->getId()],
        ));
    }

    // ─── POST /api/clients/{id}/loyalty/adjust ────────────────────────────────

    public function testAdjustRequiresAuth(): void
    {
        $id = (string) $this->seed['clientA']->getId();
        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", ['points' => 50]);
        self::assertResponseStatusCodeSame(401);
    }

    public function testAdjustPositiveCreatesLoyaltyAndBonus(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientA']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points'      => 50,
            'description' => 'Regalo walk-in',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame(50, $data['totalPoints']);
        self::assertSame(50, $data['availablePoints']);
        self::assertSame('bonus', $data['type']);
        self::assertSame(50, $data['points']);

        $conn = self::getContainer()->get(Connection::class);
        $tx   = $conn->fetchAssociative(
            'SELECT type, points, description FROM loyalty_transactions WHERE client_id = ? AND type = ?',
            [$id, 'bonus'],
        );
        self::assertIsArray($tx);
        self::assertSame(50, (int) $tx['points']);
        self::assertSame('Regalo walk-in', $tx['description']);
    }

    public function testAdjustPositiveIncrementsBothTotals(): void
    {
        // Partenza con 100 punti già assegnati
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');
        $loyalty   = (new ClientLoyalty())
            ->setTenant($this->seed['tenantA'])
            ->setClient($this->seed['clientA'])
            ->setTotalPoints(100)
            ->setAvailablePoints(100);
        $em->persist($loyalty);
        $em->flush();
        $em->clear();

        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientA']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points' => 30,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame(130, $data['totalPoints']);
        self::assertSame(130, $data['availablePoints']);
    }

    public function testAdjustNegativeBelowZeroReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientA']->getId();

        // clientA ha 0 punti disponibili — -30 va sotto zero
        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points' => -30,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertStringContainsStringIgnoringCase('insufficien', $data['error']);
    }

    public function testAdjustNegativeWithinLimitsSucceeds(): void
    {
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');
        $loyalty   = (new ClientLoyalty())
            ->setTenant($this->seed['tenantA'])
            ->setClient($this->seed['clientA'])
            ->setTotalPoints(100)
            ->setAvailablePoints(100);
        $em->persist($loyalty);
        $em->flush();
        $em->clear();

        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientA']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points'      => -30,
            'description' => 'Correzione manuale',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        // total_points non scende per aggiustamento negativo (è lifetime)
        self::assertSame(100, $data['totalPoints']);
        self::assertSame(70, $data['availablePoints']);
        self::assertSame('adjustment', $data['type']);
        self::assertSame(-30, $data['points']);
    }

    public function testAdjustZeroPointsReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientA']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points' => 0,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testAdjustCrossTenantClientReturns422(): void
    {
        $token = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $id    = (string) $this->seed['clientBCross']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/loyalty/adjust", [
            'points' => 50,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    // ─── POST /api/clients/{id}/reward-redemptions ───────────────────────────

    public function testRedeemRequiresAuth(): void
    {
        $id       = (string) $this->seed['clientA']->getId();
        $rewardId = (string) $this->seed['rewardA1']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$id/reward-redemptions", [
            'rewardId' => $rewardId,
        ]);

        self::assertResponseStatusCodeSame(401);
    }

    public function testRedeemHappyPath(): void
    {
        // Iscrivi clientA con 150 punti disponibili
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');
        $loyalty   = (new ClientLoyalty())
            ->setTenant($this->seed['tenantA'])
            ->setClient($this->seed['clientA'])
            ->setTotalPoints(200)
            ->setAvailablePoints(150);
        $em->persist($loyalty);
        $em->flush();
        $em->clear();

        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();
        $rewardId = (string) $this->seed['rewardA1']->getId(); // 50 pts cost

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => $rewardId,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(201);
        $data = $this->json();
        self::assertSame($rewardId, $data['rewardId']);
        self::assertSame(50, $data['pointsSpent']);
        self::assertSame(100, $data['availablePoints']);
        self::assertArrayHasKey('confirmedAt', $data);
        self::assertNotNull($data['confirmedAt']);

        $conn = $container->get(Connection::class);

        // total_points invariato — solo available scende
        $pts = $conn->fetchAssociative(
            'SELECT total_points, available_points FROM client_loyalty WHERE client_id = ?',
            [$clientId],
        );
        self::assertIsArray($pts);
        self::assertSame(200, (int) $pts['total_points'], 'total_points non deve scendere al riscatto');
        self::assertSame(100, (int) $pts['available_points']);

        // Transazione redeem con punti negativi
        $tx = $conn->fetchAssociative(
            'SELECT type, points FROM loyalty_transactions WHERE client_id = ? AND type = ?',
            [$clientId, 'redeem'],
        );
        self::assertIsArray($tx);
        self::assertSame(-50, (int) $tx['points']);

        // RewardRedemption con confirmed_at valorizzato
        $redemption = $conn->fetchAssociative(
            'SELECT confirmed_at, points_spent FROM reward_redemptions WHERE client_id = ? AND reward_id = ?',
            [$clientId, $rewardId],
        );
        self::assertIsArray($redemption);
        self::assertNotNull($redemption['confirmed_at']);
        self::assertSame(50, (int) $redemption['points_spent']);
    }

    public function testRedeemInsufficientPointsReturns422(): void
    {
        // clientA senza ClientLoyalty → 0 punti
        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();
        $rewardId = (string) $this->seed['rewardA1']->getId(); // 50 pts cost

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => $rewardId,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertSame('NOT_ENROLLED', $data['code']);
    }

    public function testRedeemWithEnrolledClientButInsufficientPointsReturns422(): void
    {
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');
        $loyalty   = (new ClientLoyalty())
            ->setTenant($this->seed['tenantA'])
            ->setClient($this->seed['clientA'])
            ->setTotalPoints(20)
            ->setAvailablePoints(20); // meno di 50 (costo rewardA1)
        $em->persist($loyalty);
        $em->flush();
        $em->clear();

        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();
        $rewardId = (string) $this->seed['rewardA1']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => $rewardId,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        $data = $this->json();
        self::assertSame('INSUFFICIENT_POINTS', $data['code']);
        self::assertSame(20, $data['availablePoints']);
        self::assertSame(50, $data['required']);
    }

    public function testRedeemExpensiveRewardInsufficientPoints(): void
    {
        $container = self::getContainer();
        $em        = $container->get('doctrine.orm.entity_manager');
        $loyalty   = (new ClientLoyalty())
            ->setTenant($this->seed['tenantA'])
            ->setClient($this->seed['clientA'])
            ->setTotalPoints(500)
            ->setAvailablePoints(500); // meno di 1000 (costo rewardA2)
        $em->persist($loyalty);
        $em->flush();
        $em->clear();

        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();
        $rewardId = (string) $this->seed['rewardA2']->getId(); // 1000 pts cost

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => $rewardId,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
        self::assertSame('INSUFFICIENT_POINTS', $this->json()['code']);
    }

    public function testRedeemCrossTenantClientReturns422(): void
    {
        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientBCross']->getId();
        $rewardId = (string) $this->seed['rewardA1']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => $rewardId,
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testRedeemWithInvalidRewardIdReturns422(): void
    {
        $token    = $this->login(TestTenantFixture::TENANT_A_EMAIL);
        $clientId = (string) $this->seed['clientA']->getId();

        $this->browser->jsonRequest('POST', "/api/clients/$clientId/reward-redemptions", [
            'rewardId' => '00000000-0000-0000-0000-000000000000',
        ], server: ['HTTP_AUTHORIZATION' => "Bearer $token"]);

        self::assertResponseStatusCodeSame(422);
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
