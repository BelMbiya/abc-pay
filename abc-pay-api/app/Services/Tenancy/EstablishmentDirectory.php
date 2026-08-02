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
            ->orderBy('name')
            ->get()
            ->map(fn (Establishment $e) => [
                'id' => $e->id,
                'name' => $e->name,
                'type' => $e->type,
                'level' => $e->level,
                'city' => $e->city,
                'code' => $e->merchant_code,
                'currency' => $e->currency,
                'fees' => $e->fees,
                'presets' => $e->presets,
            ])
            ->all();
    }
}
