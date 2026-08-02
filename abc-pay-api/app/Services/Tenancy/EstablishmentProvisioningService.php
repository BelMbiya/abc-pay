<?php

namespace App\Services\Tenancy;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
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

    /** Frais/montants par défaut selon le niveau. */
    private const DEFAULTS = [
        'petit' => [['Frais scolaires', "Frais d'inscription"], [50, 100]],
        'secondaire' => [['Frais scolaires', "Frais d'inscription", "Frais d'examen"], [70, 120, 200]],
        'superieur' => [['Minerval', 'Frais académiques'], [150, 250]],
    ];

    /**
     * Liste les établissements avec leur compte de connexion (email direction).
     *
     * @return array<int, array<string, mixed>>
     */
    public function list(): array
    {
        return Establishment::query()
            ->with(['staff' => fn ($q) => $q->where('role', 'direction')->with('user:id,email,name')])
            ->latest()
            ->get()
            ->map(fn (Establishment $e) => $this->row($e))
            ->all();
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

        $establishment->update($fields);

        return $this->row($establishment->fresh(['staff.user']));
    }

    /** DTO d'un établissement (avec son compte de connexion « direction »). */
    private function row(Establishment $e): array
    {
        $login = $e->staff->firstWhere('role', 'direction')?->user;

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
            'login_email' => $login?->email,
            'login_name' => $login?->name,
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
            [$fees, $presets] = self::DEFAULTS[$level];

            $establishment = Establishment::create([
                'name' => $data['name'],
                'merchant_code' => $this->uniqueMerchantCode(),
                'type' => $data['type'],
                'level' => $level,
                'city' => $data['city'] ?? null,
                'commission_rate' => isset($data['commission_rate']) ? (float) $data['commission_rate'] / 100 : 0.02,
                'currency' => $data['currency'] ?? 'USD',
                'billing_mode' => $data['billing_mode'] ?? 'payment_only',
                'fees' => $fees,
                'presets' => $presets,
                'is_active' => true,
            ]);

            $user = $this->attachLogin($establishment, $data['login_email'], $data['login_password'], $data['login_name'] ?? $data['name']);

            return $this->present($establishment, $user);
        });
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
            }
            $user->save();

            return $this->present($establishment->fresh(), $user);
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

        EstablishmentStaff::create([
            'establishment_id' => $establishment->id,
            'user_id' => $user->id,
            'role' => 'direction',
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
