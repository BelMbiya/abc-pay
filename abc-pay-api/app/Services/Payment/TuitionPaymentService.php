<?php

namespace App\Services\Payment;

use App\Models\Establishment;
use App\Models\Learner;
use App\Models\Transaction;
use App\Services\Billing\BillingService;
use App\Services\Document\ReceiptService;
use App\Services\Fraud\FraudService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Domaine Payment — logique métier du paiement Tuition.
 * Sortie des contrôleurs (DDD) : calcul des frais/commission, création de la
 * transaction, idempotence, émission du reçu. Le contrôleur ne fait qu'orchestrer.
 */
class TuitionPaymentService
{
    public function __construct(
        private readonly ReceiptService $receipts,
        private readonly BillingService $billing,
        private readonly FraudService $fraud,
    ) {}

    /** Taux de commission de l'établissement (prélevée sur son reversement). */
    public function commissionRate(Establishment $establishment): float
    {
        return (float) $establishment->commission_rate;
    }

    /**
     * Devis (recalculé côté serveur).
     * RÈGLE : aucun frais à la charge du PAYEUR pour la Tuition — il paie exactement
     * le montant. La commission abc pay est prélevée CÔTÉ ÉTABLISSEMENT (sur le net reversé).
     */
    public function quote(Establishment $establishment, float $amount): array
    {
        $amount = round($amount, 2);
        $rate = $this->commissionRate($establishment);
        $commission = round($amount * $rate, 2);

        return [
            'amount' => $amount,
            'service_fee' => 0.0,   // le payeur ne paie aucun frais
            'total' => $amount,     // total dû par le payeur = montant
            'commission_rate' => $rate,
            'commission' => $commission,                       // part abc pay (établissement)
            'net_establishment' => round($amount - $commission, 2), // net reversé à l'établissement
        ];
    }

    /**
     * Crée un paiement Tuition (idempotent) et émet le reçu.
     *
     * @param  array<string, mixed>  $data  charge validée (TuitionPaymentRequest)
     * @param  int|null  $userId  payeur authentifié (facultatif : tiers non connecté possible)
     */
    public function create(Establishment $establishment, array $data, ?string $idempotencyKey = null, ?int $userId = null): array
    {
        // Idempotence : même clé → on renvoie la transaction déjà créée (anti double débit).
        if ($idempotencyKey) {
            // SÉCURITÉ : idempotence scopée au contexte (établissement + payeur) — empêche
            // qu'un tiers rejouant une clé reçoive le reçu/qr_token d'un autre paiement.
            $existing = Transaction::with('receipt')
                ->where('idempotency_key', $idempotencyKey)
                ->where('establishment_id', $establishment->id)
                ->when($userId, fn ($q) => $q->where('user_id', $userId), fn ($q) => $q->whereNull('user_id'))
                ->first();
            if ($existing) {
                return $this->present($existing);
            }
        }

        return DB::transaction(function () use ($establishment, $data, $idempotencyKey, $userId) {
            $amount = round((float) $data['amount'], 2);
            $serviceFee = 0.0; // aucun frais à la charge du payeur (Tuition)
            $commission = round($amount * (float) $establishment->commission_rate, 2);

            $matricule = $data['student_matricule'];

            // Réconciliation par matricule : apprenant DÉJÀ inscrit (registre) ?
            // (uniquement si l'établissement gère les frais dans abc pay).
            $registered = $establishment->managesFees()
                ? $establishment->learners()->where('source', 'registre')->where('matricule', $matricule)->first()
                : null;

            // Sinon, on TRACE l'apprenant concerné (source = paiement), clé = matricule.
            $learner = $registered ?? $establishment->learners()->firstOrCreate(
                ['matricule' => $matricule, 'source' => 'paiement'],
                [
                    'abcpay_ref' => 'ABCP-'.Str::upper(Str::random(8)),
                    'last_name' => $data['student_name'],
                    'academic_group' => $data['student_info'] ?? null,
                    'parent_name' => $data['payer_name'] ?? null,
                    'parent_phone' => $data['payer_phone'] ?? null,
                    'parent_relation' => $data['payer_relation'] ?? null,
                    'status' => 'actif',
                ],
            );

            $transaction = Transaction::create([
                'establishment_id' => $establishment->id,
                'user_id' => $userId,
                'learner_id' => $learner->id,
                'student_name' => $data['student_name'],
                'student_info' => $data['student_info'] ?? null,
                'student_matricule' => $matricule,
                'payer_name' => $data['payer_name'] ?? null,
                'payer_phone' => $data['payer_phone'] ?? null,
                'payer_relation' => $data['payer_relation'] ?? null,
                'fee_type' => $data['fee_type'],
                'channel' => $data['channel'],
                'amount' => $amount,
                'service_fee' => $serviceFee,
                'commission' => $commission,
                'total' => $amount, // le payeur paie exactement le montant
                'currency' => $establishment->currency ?: app(\App\Services\Platform\SettingsService::class)->currency(),
                'status' => 'confirmee', // démo : confirmation immédiate (webhook opérateur à venir)
                'reference' => $data['reference'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'confirmed_at' => now(),
            ]);

            $this->receipts->issueFor($transaction);
            $this->fraud->flag($transaction); // évaluation anti-fraude

            // Imputation : le paiement réduit les postes de l'apprenant inscrit.
            if ($registered) {
                $this->billing->applyPayment($registered, $amount);
            }

            $sym = ($transaction->currency === 'CDF' ? 'FC' : '$');
            $notifier = app(\App\Services\Notification\NotificationService::class);

            // Notifie le payeur connecté du succès.
            if ($userId) {
                $notifier->notify(
                    $userId, 'tuition', 'success', 'Paiement Tuition réussi',
                    'Paiement de '.number_format($amount, 2, ',', ' ').' '.$sym.' à '.$establishment->name.' effectué.',
                    ['amount' => $amount, 'currency' => $transaction->currency, 'establishment' => $establishment->name],
                );
            }

            // Notifie le staff (back-office) de l'établissement de chaque nouvel encaissement,
            // pour qu'il apparaisse en temps réel dans SA session (cloche de notifications).
            $staffIds = \App\Models\EstablishmentStaff::where('establishment_id', $establishment->id)
                ->pluck('user_id')->unique()->reject(fn ($id) => $id === $userId)->all();
            foreach ($staffIds as $sid) {
                $notifier->notify(
                    $sid, 'tuition', 'success', 'Nouveau paiement encaissé',
                    number_format($amount, 2, ',', ' ').' '.$sym.' — '.$data['fee_type'].' de '.$data['student_name'].'.',
                    ['amount' => $amount, 'currency' => $transaction->currency, 'student' => $data['student_name'], 'fee_type' => $data['fee_type'], 'receipt' => $transaction->receipt?->number],
                );
            }

            return $this->present($transaction->fresh('receipt'));
        });
    }

    /** Représentation API (DTO de sortie). */
    private function present(Transaction $transaction): array
    {
        return [
            'transaction' => [
                'id' => $transaction->id,
                'amount' => $transaction->amount,
                'service_fee' => $transaction->service_fee, // 0 pour le payeur
                'commission' => $transaction->commission,   // part abc pay (établissement)
                'total' => $transaction->total,
                'status' => $transaction->status,
                'fee_type' => $transaction->fee_type,
                'channel' => $transaction->channel,
            ],
            'receipt' => [
                'number' => $transaction->receipt?->number,
                'qr_token' => $transaction->receipt?->qr_token,
            ],
        ];
    }
}
