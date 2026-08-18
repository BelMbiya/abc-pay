<?php

namespace Tests\Unit;

use App\Models\Establishment;
use App\Services\Document\ReceiptService;
use App\Services\Payment\TuitionPaymentService;
use PHPUnit\Framework\TestCase;

/**
 * Calcul du devis (unitaire, sans base de données).
 * RÈGLE MÉTIER : aucun frais à la charge du PAYEUR (Tuition) — il paie exactement
 * le montant. La commission (taux de l'établissement) est prélevée CÔTÉ ÉTABLISSEMENT.
 */
class TuitionFeeTest extends TestCase
{
    private function service(): TuitionPaymentService
    {
        return new TuitionPaymentService(
            new ReceiptService,
            new \App\Services\Billing\BillingService,
            new \App\Services\Fraud\FraudService(new \App\Services\Platform\SettingsService),
            new \App\Services\Payment\Gateways\CinetPayGateway(new \App\Services\Payment\Gateways\CinetPayClient),
        );
    }

    public function test_le_payeur_ne_paie_aucun_frais(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 250);

        $this->assertSame(0.0, $q['service_fee']);          // rien à charge du payeur
        $this->assertSame(250.0, $q['total']);              // total = montant exact
    }

    public function test_commission_prelevee_cote_etablissement(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 250);

        $this->assertSame(0.03, $q['commission_rate']);
        $this->assertSame(7.5, $q['commission']);           // 250 * 3 %
        $this->assertSame(242.5, $q['net_establishment']);  // net reversé
    }

    public function test_commission_arrondie_a_deux_decimales(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 33.33); // 33.33 * 0.03 = 0.9999 → 1.00

        $this->assertSame(1.0, $q['commission']);
        $this->assertSame(33.33, $q['total']);   // le payeur paie toujours le montant exact
    }
}
