<?php

namespace App\Services\Tenancy;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\FeeType;
use App\Models\Learner;
use App\Models\Reminder;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Platform\SettingsService;
use App\Services\Tenancy\Exceptions\EstablishmentActionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Domaine Tenancy — provisioning des établissements et de LEUR compte de connexion.
 *
 * Un établissement se connecte au back-office via un compte « direction » :
 * un User (email + mot de passe) relié par EstablishmentStaff. Ce service crée
 * l'établissement AVEC ce compte, et permet de le modifier ensuite (email / mot
 * de passe). Sortie des contrôleurs (DDD).
 */
class EstablishmentProvisioningService
{
    /** Types d'établissement → niveau (pilote les frais/champs côté payeur). */
    private const LEVEL_BY_TYPE = [
        'École maternelle' => 'petit',
        'École primaire' => 'petit',
        'École secondaire' => 'secondaire',
        'Institut supérieur' => 'superieur',
        'Université' => 'superieur',
    ];

    /**
     * Liste les établissements avec leur compte de connexion (email direction).
     *
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        $sla = app(SettingsService::class)->settlementSlaDays();

        // Une SEULE requête groupée (anti N+1) : montant en attente + plus ancien encaissement
        // non reversé, par établissement — pour l'indicateur d'échéance de reversement.
        $pending = Transaction::query()
            ->where('status', 'confirmee')
            ->where('direction', 'debit') // encaissements uniquement
            ->whereNull('settlement_id')
            ->whereNotNull('establishment_id')
            ->groupBy('establishment_id')
            ->selectRaw('establishment_id, SUM(amount) as amt, MIN(created_at) as oldest')
            ->get()
            ->keyBy('establishment_id');

        // Reprises (clawback) en attente par établissement — déduites du montant à reverser.
        $claw = \App\Models\SettlementAdjustment::query()
            ->whereNull('settlement_id')
            ->groupBy('establishment_id')
            ->selectRaw('establishment_id, SUM(amount) as claw')
            ->get()
            ->keyBy('establishment_id');

        return Establishment::query()
            ->with(['staff' => fn ($q) => $q->where('role', 'direction')->with('user:id,email,name,kyc_status'), 'documents'])
            ->latest()
            ->get()
            ->map(function (Establishment $e) use ($pending, $claw, $sla) {
                $p = $pending->get($e->id);
                $net = $p ? (float) $p->amt - (float) ($claw->get($e->id)->claw ?? 0) : null;

                return $this->row($e, $this->formatDue($net, $p?->oldest, $sla));
            })
            ->all();
    }

    /**
     * Indicateur d'échéance de reversement : à partir du plus ancien encaissement en attente,
     * calcule la date limite (+ SLA jours) et les jours restants (négatif = en retard).
     *
     * @return array<string, mixed>|null  null si rien à reverser
     */
    private function formatDue(?float $amt, ?string $oldest, int $sla): ?array
    {
        if ($amt === null || $amt <= 0 || $oldest === null) {
            return null;
        }
        $since = Carbon::parse($oldest)->startOfDay();
        $due = $since->copy()->addDays($sla);
        $today = Carbon::now()->startOfDay();
        $daysRemaining = (int) floor(($due->getTimestamp() - $today->getTimestamp()) / 86400);

        return [
            'amount' => round($amt, 2),
            'since' => $since->toDateString(),
            'due_at' => $due->toDateString(),
            'days_remaining' => $daysRemaining,
            'overdue' => $daysRemaining < 0,
            'sla_days' => $sla,
        ];
    }

    /** Échéance de reversement d'UN établissement (requête isolée, pour update/create). */
    private function dueForEstablishment(string $establishmentId): ?array
    {
        $sla = app(SettingsService::class)->settlementSlaDays();
        $p = Transaction::query()
            ->where('establishment_id', $establishmentId)
            ->where('status', 'confirmee')
            ->where('direction', 'debit') // encaissements uniquement
            ->whereNull('settlement_id')
            ->selectRaw('SUM(amount) as amt, MIN(created_at) as oldest')
            ->first();
        $claw = (float) \App\Models\SettlementAdjustment::query()
            ->where('establishment_id', $establishmentId)->whereNull('settlement_id')->sum('amount');
        $net = $p && $p->amt !== null ? (float) $p->amt - $claw : null;

        return $this->formatDue($net, $p?->oldest, $sla);
    }

    /**
     * Met à jour les informations d'un établissement (nom, type, ville, commission,
     * mode de facturation, statut actif/suspendu). Champs partiels.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(Establishment $establishment, array $data): array
    {
        $fields = [];
        if (isset($data['name'])) {
            $fields['name'] = $data['name'];
        }
        if (isset($data['type'])) {
            $fields['type'] = $data['type'];
            $fields['level'] = self::LEVEL_BY_TYPE[$data['type']] ?? $establishment->level;
        }
        if (array_key_exists('city', $data)) {
            $fields['city'] = $data['city'];
        }
        if (isset($data['commission_rate'])) {
            $fields['commission_rate'] = (float) $data['commission_rate'] / 100;
        }
        if (isset($data['currency'])) {
            $fields['currency'] = $data['currency'];
        }
        if (isset($data['billing_mode'])) {
            $fields['billing_mode'] = $data['billing_mode'];
        }
        if (array_key_exists('is_active', $data)) {
            $fields['is_active'] = (bool) $data['is_active'];
        }
        if (array_key_exists('payout_phone', $data)) {
            $fields['payout_phone'] = $data['payout_phone'];
        }
        if (array_key_exists('payout_method', $data)) {
            $fields['payout_method'] = $data['payout_method'];
        }

        $establishment->update($fields);

        return $this->row($establishment->fresh(['staff.user']), $this->dueForEstablishment($establishment->id));
    }

    /** DTO d'un établissement (avec son compte de connexion « direction »). */
    private function row(Establishment $e, ?array $settlementDue = null): array
    {
        $staff = $e->staff->firstWhere('role', 'direction');
        $login = $staff?->user;

        // Statut affiché : suspendu > en attente de vérification d'identité (direction) > actif.
        $verificationPending = (bool) $staff?->kyc_required && ($login?->kyc_status ?? 'none') !== 'approved';
        $status = ! $e->is_active ? 'suspended' : ($verificationPending ? 'pending' : 'active');

        return [
            'id' => $e->id,
            'name' => $e->name,
            'merchant_code' => $e->merchant_code,
            'type' => $e->type,
            'level' => $e->level,
            'city' => $e->city,
            'commission_rate' => (float) $e->commission_rate,
            'currency' => $e->currency,
            'billing_mode' => $e->billing_mode,
            'is_active' => (bool) $e->is_active,
            'status' => $status,
            'verification_pending' => $verificationPending,
            'verified' => $e->isFullyVerified(), // badge « Verified » (KYC/KYB validés)
            'payout_phone' => $e->payout_phone,
            'payout_method' => $e->payout_method,
            'login_email' => $login?->email,
            'login_name' => $login?->name,
            // Échéance de reversement (null = rien à reverser). Voir formatDue().
            'settlement_due' => $settlementDue,
        ];
    }

    /**
     * Crée un établissement ET son compte de connexion « direction ».
     *
     * @param  array<string, mixed>  $data  charge validée (OnboardEstablishmentRequest)
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $level = self::LEVEL_BY_TYPE[$data['type']] ?? 'superieur';

            // Aucun barème par défaut : l'établissement démarre VIDE et doit définir
            // son propre barème (fee_schedules) avant de pouvoir encaisser. Tant qu'il
            // n'en a pas, il n'apparaît pas dans la liste des écoles (cf. Directory).
            $establishment = Establishment::create([
                'name' => $data['name'],
                'merchant_code' => $this->uniqueMerchantCode(),
                'type' => $data['type'],
                'level' => $level,
                'city' => $data['city'] ?? null,
                'commission_rate' => isset($data['commission_rate']) ? (float) $data['commission_rate'] / 100 : 0.02,
                'currency' => $data['currency'] ?? 'USD',
                'billing_mode' => $data['billing_mode'] ?? 'payment_only',
                'fees' => [],
                'presets' => [],
                'is_active' => true,
            ]);

            $user = $this->attachLogin($establishment, $data['login_email'], $data['login_password'], $data['login_name'] ?? $data['name']);

            $this->storeInitialDocuments($establishment, $data);

            return $this->present($establishment, $user);
        });
    }

    /**
     * Enregistre les numéros de documents KYB (RDC) saisis à l'onboarding, en attente
     * de revue. Types alignés sur EstablishmentDocuments::CATALOG.
     *
     * @param  array<string, mixed>  $data
     */
    private function storeInitialDocuments(Establishment $establishment, array $data): void
    {
        $map = [
            'rccm_number' => 'rccm',
            'id_nat_number' => 'id_nat',
            'nif_number' => 'nif',
            'ministry_approval_number' => 'ministry_approval',
        ];

        foreach ($map as $field => $type) {
            $number = $data[$field] ?? null;
            if ($number !== null && trim((string) $number) !== '') {
                \App\Models\EstablishmentDocument::updateOrCreate(
                    ['establishment_id' => $establishment->id, 'type' => $type],
                    ['number' => trim((string) $number), 'status' => 'pending'],
                );
            }
        }
    }

    /**
     * Met à jour le compte de connexion « direction » d'un établissement.
     * Champs modifiables : email, mot de passe, nom d'affichage (partiel).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateLogin(Establishment $establishment, array $data): array
    {
        return DB::transaction(function () use ($establishment, $data) {
            $staff = EstablishmentStaff::where('establishment_id', $establishment->id)
                ->where('role', 'direction')->first();

            // Établissement sans compte (cas ancien) → on en crée un à la volée.
            if (! $staff) {
                $user = $this->attachLogin(
                    $establishment,
                    $data['login_email'],
                    $data['login_password'] ?? Str::password(12),
                    $data['login_name'] ?? $establishment->name,
                );

                return $this->present($establishment->fresh(), $user);
            }

            $user = $staff->user;
            if (! empty($data['login_email'])) {
                $user->email = $data['login_email'];
            }
            if (! empty($data['login_name'])) {
                $user->name = $data['login_name'];
            }
            if (! empty($data['login_password'])) {
                $user->password = $data['login_password']; // hashé par le cast
                $user->must_change_password = true; // reset admin → changement obligatoire ensuite
            }
            $user->save();

            return $this->present($establishment->fresh(), $user);
        });
    }

    /**
     * Supprime DÉFINITIVEMENT un établissement et sa configuration (compte de
     * connexion, frais, barèmes, apprenants, relances).
     *
     * GARDE-FOU (intégrité financière) : un établissement qui a un HISTORIQUE de
     * transactions ne peut PAS être supprimé — il faut le suspendre. On préserve
     * ainsi la piste d'audit comptable (aligné sur la suppression de compte payeur).
     *
     * @throws EstablishmentActionException
     */
    public function delete(Establishment $establishment): void
    {
        if (Transaction::where('establishment_id', $establishment->id)->exists()) {
            throw new EstablishmentActionException(
                'Cet établissement a un historique de transactions et ne peut être supprimé. Suspends-le à la place.'
            );
        }

        DB::transaction(function () use ($establishment) {
            $id = $establishment->id;

            // Comptes de connexion (direction/staff) dédiés à cet établissement.
            $staffUserIds = EstablishmentStaff::where('establishment_id', $id)->pluck('user_id');

            // Config de facturation & scolarité (enfants d'abord pour respecter les FK).
            FeeItem::where('establishment_id', $id)->delete();
            Reminder::where('establishment_id', $id)->delete();
            FeeSchedule::where('establishment_id', $id)->delete();
            \App\Models\EstablishmentDocument::where('establishment_id', $id)->delete();
            Learner::where('establishment_id', $id)->delete();
            FeeType::where('establishment_id', $id)->delete();
            EstablishmentStaff::where('establishment_id', $id)->delete();

            // Supprime les comptes de connexion dédiés — sauf s'ils portent des
            // transactions (compte réutilisé) : on les laisse alors intacts.
            User::whereIn('id', $staffUserIds)->whereDoesntHave('transactions')->delete();

            $establishment->delete();
        });
    }

    /** Crée le User de connexion + le lien EstablishmentStaff (rôle direction). */
    private function attachLogin(Establishment $establishment, string $email, string $password, string $name): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password, // hashé par le cast du modèle
        ]);
        // Mot de passe provisoire → changement OBLIGATOIRE à la 1re connexion (hors allowlist).
        $user->forceFill(['must_change_password' => true])->save();

        EstablishmentStaff::create([
            'establishment_id' => $establishment->id,
            'user_id' => $user->id,
            'role' => 'direction',
            // Comptes créés désormais : vérification KYC obligatoire pour accéder/agir.
            'kyc_required' => true,
        ]);

        return $user;
    }

    /** Génère un code marchand unique ABC-TUITION-xxx. */
    private function uniqueMerchantCode(): string
    {
        do {
            $code = 'ABC-TUITION-'.str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT).Str::upper(Str::random(2));
        } while (Establishment::where('merchant_code', $code)->exists());

        return $code;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Establishment $establishment, User $login): array
    {
        return [
            'id' => $establishment->id,
            'name' => $establishment->name,
            'merchant_code' => $establishment->merchant_code,
            'type' => $establishment->type,
            'level' => $establishment->level,
            'city' => $establishment->city,
            'commission_rate' => (float) $establishment->commission_rate,
            'billing_mode' => $establishment->billing_mode,
            'is_active' => (bool) $establishment->is_active,
            'login_email' => $login->email,
            'login_name' => $login->name,
        ];
    }
}
