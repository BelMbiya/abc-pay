<?php

namespace App\Services\Identity;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;

/**
 * Domaine Identity — annuaire du personnel d'un établissement (consultation seule).
 */
class StaffDirectoryService
{
    /** @return array<int, array<string, mixed>> */
    public function listMembers(Establishment $establishment): array
    {
        return EstablishmentStaff::with('user')
            ->where('establishment_id', $establishment->id)
            ->orderBy('created_at')
            ->get()
            ->map(fn (EstablishmentStaff $s) => [
                'id' => $s->id,
                'name' => $s->user?->name,
                'email' => $s->user?->email,
                'role' => $s->role,
            ])
            ->all();
    }
}
