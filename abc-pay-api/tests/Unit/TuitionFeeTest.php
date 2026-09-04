<?php

namespace Tests\Unit;

use App\Models\Establishment;
use App\Services\Document\ReceiptService;
use App\Services\Payment\TuitionPaymentService;
use PHPUnit\Framework\TestCase;

/**
 * Calcul du devis (unitaire, sans base de données).
 * RÈGLE MÉTIER : les frais (commission au taux de l'établissement) sont À LA CHARGE DU
 * PAYEUR — il paie `montant + frais`. L'ÉTABLISSEMENT reçoit le MONTANT PLEIN, sans déduction.
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

    public function test_frais_a_charge_du_payeur(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 250);

        $this->assertSame(7.5, $q['service_fee']);          // frais à la charge du payeur (250 * 3 %)
        $this->assertSame(257.5, $q['total']);              // total payeur = montant + frais
    }

    public function test_etablissement_recoit_le_montant_plein(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 250);

        $this->assertSame(0.03, $q['commission_rate']);
        $this->assertSame(7.5, $q['commission']);           // revenu abc pay (= frais payeur)
        $this->assertSame(250.0, $q['net_establishment']);  // l'établissement reçoit le montant PLEIN
    }

    public function test_commission_arrondie_a_deux_decimales(): void
    {
        $e = new Establishment(['commission_rate' => 0.03]);
        $q = $this->service()->quote($e, 33.33); // 33.33 * 0.03 = 0.9999 → 1.00

        $this->assertSame(1.0, $q['commission']);
        $this->assertSame(34.33, $q['total']);   // le payeur paie montant + frais (33.33 + 1.00)
    }
}
