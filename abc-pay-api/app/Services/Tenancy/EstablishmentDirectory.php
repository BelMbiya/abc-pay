<?php

namespace App\Services\Tenancy;

use App\Models\Establishment;

/**
 * Domaine Tenancy — annuaire des établissements partenaires.
 * Encapsule la recherche et la mise en forme (hors contrôleur, DDD).
 */
class EstablishmentDirectory
{
    /**
     * Recherche les établissements actifs (nom / type / ville).
     *
     * @return array<int, array<string, mixed>>
     */
    public function search(?string $query = null): array
    {
        $query = trim((string) $query);

        return Establishment::query()
            ->where('is_active', true)
            ->when($query !== '', function ($builder) use ($query) {
                $builder->where(function ($sub) use ($query) {
                    $sub->where('name', 'like', "%{$query}%")
                        ->orWhere('type', 'like', "%{$query}%")
                        ->orWhere('city', 'like', "%{$query}%");
                });
            })
            ->with(['feeSchedules.feeType', 'staff.user:id,kyc_status', 'documents'])
            ->orderBy('name')
            ->get()
            // RÈGLE : un établissement non encaissable (suspendu, identité en cours de
            // vérification, ou KYB incomplet quand il est exigé) n'apparaît pas dans la liste.
            ->reject(fn (Establishment $e) => ! $e->canReceivePayments())
            ->map(function (Establishment $e) {
                $bareme = $e->resolvedBareme();

                return [
                    'id' => $e->id,
                    'name' => $e->name,
                    'type' => $e->type,
                    'level' => $e->level,
                    'city' => $e->city,
                    'code' => $e->merchant_code,
                    'currency' => $e->currency,
                    'fees' => $bareme['fees'],
                    'presets' => $bareme['presets'],
                ];
            })
            // RÈGLE : un établissement sans barème n'est pas encaissable → on ne le
            // propose pas au paiement (il n'apparaît pas dans la liste des écoles).
            ->filter(fn (array $row) => $row['fees'] !== [])
            ->values()
            ->all();
    }
}
