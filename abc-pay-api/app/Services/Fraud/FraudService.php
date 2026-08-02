<?php

namespace App\Services\Fraud;

use App\Models\FraudFlag;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Platform\SettingsService;

/**
 * Domaine Fraud — moteur de détection (LBC/FT).
 * Chaque transaction est évaluée par un jeu de règles ; si un signal dépasse le seuil,
 * un signalement est PERSISTÉ (FraudFlag) pour revue admin (écarter / bloquer le compte).
 * SRP : la logique de règles + persistance + actions est isolée ici, hors contrôleur.
 */
class FraudService
{
    private const LARGE_USD = 500;      // montant élevé
    private const VERY_LARGE_USD = 2000; // montant très élevé
    private const NO_KYC_USD = 100;     // seuil au-delà duquel un compte non-KYC est suspect
    private const VELOCITY_COUNT = 5;   // nb de transactions…
    private const VELOCITY_MINUTES = 10; // …dans cette fenêtre = vélocité anormale

    public function __construct(private readonly SettingsService $settings) {}

    /**
     * Évalue une transaction et renvoie le signal le plus fort (ou null si RAS).
     *
     * @return array{rule:string,severity:string,score:int,reason:string}|null
     */
    public function evaluate(Transaction $tx): ?array
    {
        $signals = [];
        $currency = $tx->currency ?: $this->settings->currency();
        $amountUsd = $this->settings->convert((float) $tx->amount, $currency, 'USD');
        $user = $tx->user_id ? User::find($tx->user_id) : null;

        if ($user && $user->is_blocked) {
            $signals[] = ['rule' => 'blocked', 'severity' => 'high', 'score' => 90, 'reason' => 'Opération depuis un compte déjà bloqué.'];
        }

        if ($amountUsd >= self::VERY_LARGE_USD) {
            $signals[] = ['rule' => 'large_amount', 'severity' => 'high', 'score' => 75, 'reason' => 'Montant très élevé (≈ '.number_format($amountUsd, 0, ',', ' ').' $).'];
        } elseif ($amountUsd >= self::LARGE_USD) {
            $signals[] = ['rule' => 'large_amount', 'severity' => 'medium', 'score' => 55, 'reason' => 'Montant élevé (≈ '.number_format($amountUsd, 0, ',', ' ').' $).'];
        }

        if ($tx->status === 'echouee') {
            $signals[] = ['rule' => 'failed', 'severity' => 'low', 'score' => 25, 'reason' => 'Transaction en échec (à surveiller si répété).'];
        }

        if ($user) {
            $recent = Transaction::where('user_id', $user->id)
                ->where('created_at', '>=', now()->subMinutes(self::VELOCITY_MINUTES))
                ->count();
            if ($recent >= self::VELOCITY_COUNT) {
                $signals[] = ['rule' => 'velocity', 'severity' => 'medium', 'score' => 60, 'reason' => $recent.' opérations en '.self::VELOCITY_MINUTES.' min (vélocité anormale).'];
            }

            if (! $user->hasCompleteKyc() && $amountUsd >= self::NO_KYC_USD) {
                $signals[] = ['rule' => 'no_kyc', 'severity' => 'medium', 'score' => 50, 'reason' => 'Compte non vérifié (KYC) au-dessus de '.self::NO_KYC_USD.' $.'];
            }
        }

        if (empty($signals)) {
            return null;
        }

        usort($signals, fn ($a, $b) => $b['score'] <=> $a['score']);

        return $signals[0];
    }

    /** Évalue puis persiste un signalement si nécessaire. Renvoie le flag créé (ou null). */
    public function flag(Transaction $tx): ?FraudFlag
    {
        $signal = $this->evaluate($tx);
        if ($signal === null) {
            return null;
        }

        return FraudFlag::create([
            'transaction_id' => $tx->id,
            'user_id' => $tx->user_id,
            'rule' => $signal['rule'],
            'severity' => $signal['severity'],
            'score' => $signal['score'],
            'reason' => $signal['reason'],
            'status' => 'open',
        ]);
    }

    /** Liste les signalements (admin), du plus récent au plus ancien. */
    public function list(?string $status = null, int $limit = 300): array
    {
        $q = FraudFlag::query()->with('transaction')->latest();
        if ($status) {
            $q->where('status', $status);
        }

        return $q->limit($limit)->get()->map(fn (FraudFlag $f) => $this->row($f))->all();
    }

    /** Nombre de signalements ouverts (badge admin). */
    public function openCount(): int
    {
        return FraudFlag::where('status', 'open')->count();
    }

    /** Écarte un signalement (faux positif). */
    public function dismiss(FraudFlag $flag, string $by): array
    {
        $flag->update(['status' => 'dismissed', 'resolved_at' => now(), 'resolved_by' => $by]);

        return $this->row($flag->fresh('transaction'));
    }

    /** Bloque le compte de l'auteur du signalement et marque le flag comme traité. */
    public function blockUser(FraudFlag $flag, string $by): array
    {
        if ($flag->user_id) {
            User::where('id', $flag->user_id)->update([
                'is_blocked' => true,
                'blocked_reason' => 'Compte bloqué suite à un signalement de fraude ('.$flag->rule.').',
            ]);
        }
        $flag->update(['status' => 'actioned', 'resolved_at' => now(), 'resolved_by' => $by]);

        return $this->row($flag->fresh('transaction'));
    }

    /** DTO d'un signalement (avec un aperçu de la transaction). */
    private function row(FraudFlag $f): array
    {
        $tx = $f->transaction;

        return [
            'id' => $f->id,
            'rule' => $f->rule,
            'severity' => $f->severity,
            'score' => $f->score,
            'reason' => $f->reason,
            'status' => $f->status,
            'resolved_by' => $f->resolved_by,
            'created_at' => $f->created_at?->toIso8601String(),
            'transaction' => $tx ? [
                'id' => $tx->id,
                'type' => $tx->type,
                'amount' => (float) $tx->amount,
                'currency' => $tx->currency,
                'status' => $tx->status,
                'channel' => $tx->channel,
                'counterparty_name' => $tx->counterparty_name,
                'counterparty_phone' => $tx->counterparty_phone,
            ] : null,
        ];
    }
}
