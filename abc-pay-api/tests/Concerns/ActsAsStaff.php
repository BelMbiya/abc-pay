<?php

namespace Tests\Concerns;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\JwtService;

/**
 * Fabrique un jeton staff valide pour un établissement (tests back-office).
 * Nécessite WithJwtKeys (clés RS256 en config).
 */
trait ActsAsStaff
{
    protected function staffTokenFor(Establishment $establishment, string $role = 'direction'): string
    {
        $user = User::factory()->create();
        EstablishmentStaff::create([
            'establishment_id' => $establishment->id,
            'user_id' => $user->id,
            'role' => $role,
        ]);

        return app(JwtService::class)->issueStaffAccess($user, $establishment->id, $role);
    }

    /** @return array<string, string> */
    protected function staffHeaders(Establishment $establishment, string $role = 'direction'): array
    {
        return ['Authorization' => 'Bearer '.$this->staffTokenFor($establishment, $role)];
    }
}
