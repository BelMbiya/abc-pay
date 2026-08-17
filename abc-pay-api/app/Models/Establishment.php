<?php

namespace App\Models;

use Database\Factories\EstablishmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Establishment extends Model
{
    /** @use HasFactory<EstablishmentFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'name', 'merchant_code', 'type', 'level', 'city',
        'commission_rate', 'currency', 'billing_mode', 'fees', 'presets', 'is_active',
        'payout_phone', 'payout_method',
    ];

    /** Réglages par défaut d'un établissement (fusionnés avec la colonne `settings`). */
    public const DEFAULT_SETTINGS = [
        'accept_refunds' => true,          // l'établissement accepte les demandes de remboursement
        'refund_window_days' => null,      // null = utiliser le délai plateforme ; sinon surcharge (jours)
        'notify_staff_on_payment' => true, // notifier le staff à chaque encaissement
    ];

    public function managesFees(): bool
    {
        return $this->billing_mode === 'fee_management';
    }

    /**
     * Barème EFFECTIF du paiement (source de vérité).
     *
     * Dérivé du barème relationnel `fee_schedules` (ce que l'établissement édite
     * réellement dans son back-office) quand il existe ; repli sur les colonnes
     * legacy `fees`/`presets` sinon. Agrège par type de frais ; le plafond d'un
     * type = son montant le PLUS ÉLEVÉ au barème (empêche tout surpaiement, même
     * si plusieurs promotions ont des montants différents).
     *
     * @return array{fees: list<string>, presets: list<float>}
     */
    public function resolvedBareme(): array
    {
        $schedules = $this->relationLoaded('feeSchedules')
            ? $this->feeSchedules
            : $this->feeSchedules()->with('feeType')->get();

        if ($schedules->isNotEmpty()) {
            $byType = [];
            foreach ($schedules as $schedule) {
                $name = $schedule->feeType?->name;
                if ($name === null || $name === '') {
                    continue;
                }
                $amount = (float) $schedule->amount;
                $byType[$name] = isset($byType[$name]) ? max($byType[$name], $amount) : $amount;
            }
            if ($byType !== []) {
                return ['fees' => array_keys($byType), 'presets' => array_values($byType)];
            }
        }

        return [
            'fees' => array_values((array) $this->fees),
            'presets' => array_map('floatval', array_values((array) $this->presets)),
        ];
    }

    /** Un établissement est encaissable seulement s'il a défini un barème. */
    public function hasBareme(): bool
    {
        return $this->resolvedBareme()['fees'] !== [];
    }

    /**
     * L'établissement est-il EN COURS DE VÉRIFICATION (documents/identité) ?
     * Vrai si son compte « direction » exige un KYC non encore approuvé. Un tel
     * établissement ne peut ni recevoir de paiement ni apparaître dans l'annuaire.
     * (Établissement legacy sans compte direction → considéré vérifié, pas de blocage rétroactif.)
     */
    public function verificationPending(): bool
    {
        $direction = $this->relationLoaded('staff')
            ? $this->staff->firstWhere('role', 'direction')
            : $this->staff()->where('role', 'direction')->with('user:id,kyc_status')->first();

        if (! $direction || ! $direction->kyc_required) {
            return false;
        }

        return ($direction->user?->kyc_status ?? 'none') !== 'approved';
    }

    /** L'établissement est vérifié (peut encaisser / être listé). */
    public function isVerified(): bool
    {
        return ! $this->verificationPending();
    }

    /**
     * L'établissement est-il soumis au KYB (documents d'entreprise) ? Vrai dès qu'il a
     * une direction dont la vérification est exigée. Les établissements « legacy » /
     * de démo (kyc_required=false) ne le sont pas → grandfathered.
     */
    public function requiresKyb(): bool
    {
        $direction = $this->relationLoaded('staff')
            ? $this->staff->firstWhere('role', 'direction')
            : $this->staff()->where('role', 'direction')->first();

        return (bool) $direction?->kyc_required;
    }

    /** Tous les documents KYB OBLIGATOIRES sont-ils approuvés ? */
    public function kybComplete(): bool
    {
        $required = \App\Services\Tenancy\EstablishmentDocuments::requiredKeys($this);
        if ($required === []) {
            return true;
        }
        $docs = $this->relationLoaded('documents') ? $this->documents : $this->documents()->get();
        $approved = $docs->where('status', 'approved')->pluck('type')->all();

        return array_diff($required, $approved) === [];
    }

    /**
     * Barrière d'encaissement complète : actif + identité vérifiée + (KYB complet si
     * exigé). Le barème est vérifié séparément (au moment du paiement / de l'annuaire).
     */
    public function canReceivePayments(): bool
    {
        if (! $this->is_active || $this->verificationPending()) {
            return false;
        }

        return ! $this->requiresKyb() || $this->kybComplete();
    }

    /** Réglages effectifs (défauts + surcharges stockées). */
    public function resolvedSettings(): array
    {
        return array_merge(self::DEFAULT_SETTINGS, is_array($this->settings) ? $this->settings : []);
    }

    /** Valeur d'un réglage (avec repli sur le défaut). */
    public function setting(string $key): mixed
    {
        return $this->resolvedSettings()[$key] ?? null;
    }

    protected function casts(): array
    {
        return [
            'fees' => 'array',
            'presets' => 'array',
            'settings' => 'array',
            'commission_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function feeTypes(): HasMany
    {
        return $this->hasMany(FeeType::class);
    }

    public function learners(): HasMany
    {
        return $this->hasMany(Learner::class);
    }

    public function feeSchedules(): HasMany
    {
        return $this->hasMany(FeeSchedule::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(EstablishmentDocument::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(EstablishmentStaff::class);
    }
}
