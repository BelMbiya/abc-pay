<?php

namespace App\Services\Fraud;

use App\Models\Establishment;
use App\Models\FraudFlag;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Notification\AdminNotificationService;
use App\Services\Platform\SettingsService;

/**
 * Domaine Fraud — moteur de détection (LBC/FT).
 * Chaque transaction est évaluée par un jeu de règles ; si un signal dépasse le seuil,
 * un signalement est PERSISTÉ (FraudFlag) pour revue admin (écarter / bloquer le compte).
 * SRP : la logique de règles + persistance + actions est isolée ici, hors contrôleur.
 */
class FraudService
{
    // --- Seuils (montants en USD, fenêtres en minutes/heures/jours) ----------
    private const LARGE_USD = 500;
    private const VERY_LARGE_USD = 2000;
    private const NO_KYC_USD = 100;
    private const VELOCITY_COUNT = 5;
    private const VELOCITY_MINUTES = 10;
    private const STRUCTURING_HOURS = 24;
    private const STRUCTURING_MIN_TX = 3;
    private const FANOUT_MINUTES = 30;
    private const FANOUT_DISTINCT = 4;
    private const FANIN_MINUTES = 60;
    private const FANIN_DISTINCT = 5;
    private const NEW_ACCOUNT_HOURS = 24;
    private const NEW_ACCOUNT_USD = 300;
    private const DORMANT_DAYS = 60;
    private const OFF_HOUR_END = 5;      // 00h–05h (Kinshasa)
    private const OFF_HOURS_USD = 100;
    private const MATRICULE_FANIN_MIN = 60;
    private const MATRICULE_FANIN_DISTINCT = 3;
    private const PAYER_FANOUT_MIN = 30;
    private const PAYER_FANOUT_DISTINCT = 4;
    private const FEE_MISMATCH_FACTOR = 4;
    private const FAILURE_MIN = 60;
    private const FAILURE_COUNT = 3;
    private const REFUND_DAYS = 30;
    private const REFUND_COUNT = 3;
    private const CHANNEL_SWITCH_MIN = 30;
    private const CHANNEL_SWITCH_DISTINCT = 3;
    private const NEW_BENEFICIARY_USD = 500;
    private const CROSS_CCY_MINUTES = 30;

    /**
     * Score au-delà duquel le compte est BLOQUÉ AUTOMATIQUEMENT (LBC/FT — mise en
     * sécurité immédiate sur risque critique). Le compte bloqué ne peut plus initier
     * d'opération ; un administrateur peut le débloquer après revue.
     */
    private const AUTO_BLOCK_SCORE = 90;

    /** Gravité du signalement → niveau du fil admin. */
    private const SEVERITY_LEVEL = ['high' => 'critical', 'medium' => 'warning', 'low' => 'info'];

    // AdminNotificationService optionnel : les tests unitaires (sans conteneur/BD) instancient
    // FraudService à la main sans ce service ; en production le conteneur l'injecte.
    public function __construct(
        private readonly SettingsService $settings,
        private readonly ?AdminNotificationService $adminNotify = null,
    ) {}

    /**
     * Évalue une transaction contre un jeu de règles LBC/FT + anti-mule + KYC.
     * Renvoie le signal le PLUS FORT ; si plusieurs signaux se cumulent, le score
     * est relevé et la raison enrichie (risque composé — logique d'audit).
     *
     * @return array{rule:string,severity:string,score:int,reason:string}|null
     */
    public function evaluate(Transaction $tx): ?array
    {
        /** @var array<int,array{rule:string,severity:string,score:int,reason:string}> $signals */
        $signals = [];
        $push = function (string $rule, string $severity, int $score, string $reason) use (&$signals): void {
            $signals[] = compact('rule', 'severity', 'score', 'reason');
        };

        $currency = $tx->currency ?: $this->settings->currency();
        $amountUsd = $this->settings->convert((float) $tx->amount, $currency, 'USD');
        $user = $tx->user_id ? User::find($tx->user_id) : null;

        /* ------------------------- Compte & identité ------------------------- */
        if ($user && $user->is_blocked) {
            $push('blocked', 'high', 90, 'Opération depuis un compte déjà bloqué.');
        }
        if ($user && $user->id_doc_number) {
            $dupes = User::where('id_doc_number', $user->id_doc_number)->where('id', '!=', $user->id)->count();
            if ($dupes > 0) {
                $push('duplicate_id', 'high', 82, 'Même pièce d’identité sur '.($dupes + 1).' comptes (identité dupliquée/synthétique).');
            }
        }
        if ($user && $user->created_at && $user->created_at->gt(now()->subHours(self::NEW_ACCOUNT_HOURS)) && $amountUsd >= self::NEW_ACCOUNT_USD) {
            $push('new_account_high', 'medium', 50, 'Compte créé il y a < '.self::NEW_ACCOUNT_HOURS.' h pour ≈ '.$this->fmt($amountUsd).' $ (mule fraîche ?).');
        }

        /* ------------------------------ Montant ------------------------------ */
        if ($amountUsd >= self::VERY_LARGE_USD) {
            $push('large_amount', 'high', 75, 'Montant très élevé (≈ '.$this->fmt($amountUsd).' $).');
        } elseif ($amountUsd >= self::LARGE_USD) {
            $push('large_amount', 'medium', 55, 'Montant élevé (≈ '.$this->fmt($amountUsd).' $).');
        }
        // Fractionnement / smurfing : plusieurs paiements SOUS le seuil qui, cumulés, le dépassent.
        if ($user && $amountUsd < self::LARGE_USD) {
            $recent = Transaction::where('user_id', $user->id)
                ->where('created_at', '>=', now()->subHours(self::STRUCTURING_HOURS))
                ->where('status', '!=', 'echouee')->get(['amount', 'currency']);
            if ($recent->count() + 1 >= self::STRUCTURING_MIN_TX) {
                $sumUsd = $amountUsd + $recent->sum(fn ($t) => $this->settings->convert((float) $t->amount, $t->currency ?: $currency, 'USD'));
                if ($sumUsd >= self::LARGE_USD) {
                    $push('structuring', 'medium', 68, 'Fractionnement : '.($recent->count() + 1).' paiements sous le seuil totalisant ≈ '.$this->fmt($sumUsd).' $ en '.self::STRUCTURING_HOURS.' h.');
                }
            }
        }

        /* ---------------------- Comportement du compte ----------------------- */
        $localHour = ($tx->created_at ?? now())->copy()->setTimezone('Africa/Kinshasa')->hour;
        if ($localHour < self::OFF_HOUR_END && $amountUsd >= self::OFF_HOURS_USD) {
            $push('off_hours', 'low', 35, 'Opération en pleine nuit ('.$localHour.'h Kinshasa) pour ≈ '.$this->fmt($amountUsd).' $.');
        }
        if ($user) {
            if (Transaction::where('user_id', $user->id)->where('created_at', '>=', now()->subMinutes(self::VELOCITY_MINUTES))->count() >= self::VELOCITY_COUNT) {
                $push('velocity', 'medium', 60, 'Vélocité anormale : ≥ '.self::VELOCITY_COUNT.' opérations en '.self::VELOCITY_MINUTES.' min.');
            }
            if (! $user->hasCompleteKyc() && $amountUsd >= self::NO_KYC_USD) {
                $push('no_kyc', 'medium', 50, 'Compte non vérifié (KYC) au-dessus de '.self::NO_KYC_USD.' $.');
            }
            $prev = Transaction::where('user_id', $user->id)->where('id', '!=', $tx->id)->latest('created_at')->first();
            if ($prev && $prev->created_at && $prev->created_at->lt(now()->subDays(self::DORMANT_DAYS))) {
                $push('dormant', 'medium', 48, 'Compte dormant depuis > '.self::DORMANT_DAYS.' j qui se réactive (possible prise de contrôle).');
            }
            if (Transaction::where('user_id', $user->id)->where('status', 'echouee')->where('created_at', '>=', now()->subMinutes(self::FAILURE_MIN))->count() >= self::FAILURE_COUNT) {
                $push('repeated_failures', 'medium', 58, '≥ '.self::FAILURE_COUNT.' échecs en '.self::FAILURE_MIN.' min (test de wallets/carte).');
            }
            if (Transaction::where('user_id', $user->id)->where('created_at', '>=', now()->subMinutes(self::CHANNEL_SWITCH_MIN))->distinct()->pluck('channel')->filter()->count() >= self::CHANNEL_SWITCH_DISTINCT) {
                $push('channel_switching', 'medium', 52, '≥ '.self::CHANNEL_SWITCH_DISTINCT.' canaux différents en '.self::CHANNEL_SWITCH_MIN.' min (essai de plusieurs wallets).');
            }
            if (Transaction::where('user_id', $user->id)->where('created_at', '>=', now()->subMinutes(self::CROSS_CCY_MINUTES))->distinct()->pluck('currency')->filter()->count() >= 2) {
                $push('cross_currency', 'low', 40, 'Allers-retours USD/CDF rapprochés (possible arbitrage de change).');
            }
            if (Transaction::where('user_id', $user->id)->whereIn('status', ['annulee', 'remboursee'])->where('created_at', '>=', now()->subDays(self::REFUND_DAYS))->count() >= self::REFUND_COUNT) {
                $push('refund_abuse', 'medium', 50, '≥ '.self::REFUND_COUNT.' annulations/remboursements en '.self::REFUND_DAYS.' j (abus de remboursement).');
            }
        }

        /* ---------------------- Envoi P2P (mule / APP fraud) ----------------- */
        if ($tx->type === 'send' && $tx->counterparty_phone) {
            if ($user) {
                if (Transaction::where('user_id', $user->id)->where('type', 'send')->where('created_at', '>=', now()->subMinutes(self::FANOUT_MINUTES))->distinct()->pluck('counterparty_phone')->filter()->count() >= self::FANOUT_DISTINCT) {
                    $push('fan_out', 'medium', 64, '≥ '.self::FANOUT_DISTINCT.' bénéficiaires distincts en '.self::FANOUT_MINUTES.' min (dispersion type mule).');
                }
                $seen = Transaction::where('user_id', $user->id)->where('type', 'send')->where('counterparty_phone', $tx->counterparty_phone)->where('id', '!=', $tx->id)->exists();
                if (! $seen && $amountUsd >= self::NEW_BENEFICIARY_USD) {
                    $push('new_beneficiary', 'medium', 56, 'Gros transfert (≈ '.$this->fmt($amountUsd).' $) vers un bénéficiaire jamais utilisé (fraude au virement / ingénierie sociale).');
                }
            }
            if (Transaction::where('type', 'send')->where('counterparty_phone', $tx->counterparty_phone)->where('created_at', '>=', now()->subMinutes(self::FANIN_MINUTES))->distinct()->pluck('user_id')->filter()->count() >= self::FANIN_DISTINCT) {
                $push('fan_in', 'high', 70, '≥ '.self::FANIN_DISTINCT.' payeurs distincts vers le même numéro en '.self::FANIN_MINUTES.' min (collecte type mule).');
            }
        }

        /* ------------------------- Tuition (fraude scolaire) ---------------- */
        if ($tx->type === 'tuition' || $tx->student_matricule) {
            if ($tx->student_matricule && Transaction::where('student_matricule', $tx->student_matricule)->where('created_at', '>=', now()->subMinutes(self::MATRICULE_FANIN_MIN))->distinct()->pluck('user_id')->filter()->count() >= self::MATRICULE_FANIN_DISTINCT) {
                $push('matricule_fanin', 'medium', 54, '≥ '.self::MATRICULE_FANIN_DISTINCT.' payeurs distincts sur le même matricule en '.self::MATRICULE_FANIN_MIN.' min (matricule volé/testé).');
            }
            if ($user && Transaction::where('user_id', $user->id)->whereNotNull('student_matricule')->where('created_at', '>=', now()->subMinutes(self::PAYER_FANOUT_MIN))->distinct()->pluck('student_matricule')->filter()->count() >= self::PAYER_FANOUT_DISTINCT) {
                $push('matricule_fanout', 'medium', 62, '≥ '.self::PAYER_FANOUT_DISTINCT.' matricules différents payés par le même compte en '.self::PAYER_FANOUT_MIN.' min (données volées testées en masse).');
            }
            if ($tx->establishment_id) {
                $presets = (array) (Establishment::find($tx->establishment_id)?->presets ?? []);
                $maxPreset = $presets ? max(array_map('floatval', $presets)) : 0.0;
                if ($maxPreset > 0 && (float) $tx->amount >= $maxPreset * self::FEE_MISMATCH_FACTOR) {
                    $push('fee_mismatch', 'medium', 52, 'Montant très supérieur au barème de l’établissement (blanchiment via frais scolaires ?).');
                }
            }
        }

        /* ------------------------------- Échec ------------------------------- */
        if ($tx->status === 'echouee') {
            $push('failed', 'low', 25, 'Transaction en échec (à surveiller si répété).');
        }

        if (empty($signals)) {
            return null;
        }

        usort($signals, fn ($a, $b) => $b['score'] <=> $a['score']);
        $top = $signals[0];

        // Risque COMPOSÉ : plusieurs signaux concordants → on relève le score et
        // on trace les autres règles (indispensable pour l'audit / la revue).
        if (count($signals) > 1) {
            $others = array_values(array_unique(array_slice(array_column($signals, 'rule'), 1)));
            $top['reason'] .= ' (+ '.count($others).' signal(aux) : '.implode(', ', $others).')';
            $top['score'] = min(99, $top['score'] + 8);
            if (count($signals) >= 3 && $top['severity'] === 'medium') {
                $top['severity'] = 'high';
            }
        }

        return $top;
    }

    private function fmt(float $usd): string
    {
        return number_format($usd, 0, ',', ' ');
    }

    /** Évalue puis persiste un signalement si nécessaire. Renvoie le flag créé (ou null). */
    public function flag(Transaction $tx): ?FraudFlag
    {
        $signal = $this->evaluate($tx);
        if ($signal === null) {
            return null;
        }

        $flag = FraudFlag::create([
            'transaction_id' => $tx->id,
            'user_id' => $tx->user_id,
            'rule' => $signal['rule'],
            'severity' => $signal['severity'],
            'score' => $signal['score'],
            'reason' => $signal['reason'],
            'status' => 'open',
        ]);

        // Blocage AUTOMATIQUE sur risque critique (LBC/FT) : au-delà du seuil, le compte
        // à l'origine de l'opération est gelé immédiatement — il ne pourra plus initier
        // d'opération jusqu'à revue/déblocage par un administrateur.
        $autoBlocked = false;
        if ($signal['score'] >= self::AUTO_BLOCK_SCORE && ($user = $tx->user ?: ($tx->user_id ? User::find($tx->user_id) : null)) && ! $user->is_blocked) {
            $user->update([
                'is_blocked' => true,
                'blocked_reason' => 'Blocage automatique (risque '.$signal['score'].') — '.$signal['rule'],
            ]);
            $autoBlocked = true;
        }

        // Alerte le fil admin (best-effort : ne jamais casser le paiement en cours).
        try {
            $this->adminNotify?->push(
                type: 'fraud',
                level: self::SEVERITY_LEVEL[$flag->severity] ?? 'warning',
                title: ($autoBlocked ? 'Compte bloqué automatiquement' : 'Signalement de fraude').' ('.$flag->severity.', score '.$flag->score.')',
                body: $flag->reason.($autoBlocked ? ' — compte gelé, à revoir.' : ''),
                meta: ['flag_id' => $flag->id, 'rule' => $flag->rule, 'transaction_id' => $flag->transaction_id, 'auto_blocked' => $autoBlocked],
            );
        } catch (\Throwable) {
            // silencieux : l'alerte est secondaire, le signalement est déjà persisté.
        }

        return $flag;
    }

    /** Liste les signalements (admin), du plus récent au plus ancien. */
    public function list(?string $status = null, int $limit = 300): array
    {
        $q = FraudFlag::query()->with(['transaction', 'user'])->latest();
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
        $user = $f->relationLoaded('user') ? $f->user : ($f->user_id ? User::find($f->user_id) : null);

        return [
            'id' => $f->id,
            'rule' => $f->rule,
            'severity' => $f->severity,
            'score' => $f->score,
            'reason' => $f->reason,
            'status' => $f->status,
            'resolved_by' => $f->resolved_by,
            'created_at' => $f->created_at?->toIso8601String(),
            // Compte concerné (pour ouvrir sa fiche complète depuis la vue fraude).
            'user_id' => $f->user_id,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'is_blocked' => (bool) $user->is_blocked,
                'kyc_status' => $user->kyc_status,
            ] : null,
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
