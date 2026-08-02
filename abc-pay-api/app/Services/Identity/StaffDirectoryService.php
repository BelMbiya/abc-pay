<?php

namespace App\Services\Identity;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\Exceptions\InvalidCredentialsException;
use Illuminate\Support\Facades\Hash;

/**
 * Domaine Identity — annuaire du personnel d'un établissement.
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

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     *
     * @throws InvalidCredentialsException
     */
    public function addMember(Establishment $establishment, array $data): array
    {
        $user = User::firstOrCreate(
            ['email' => $data['email']],
            ['name' => $data['name'], 'password' => Hash::make($data['password'])],
        );

        if (EstablishmentStaff::where('establishment_id', $establishment->id)->where('user_id', $user->id)->exists()) {
            throw new InvalidCredentialsException('Ce membre fait déjà partie de l\'établissement.');
        }

        $staff = EstablishmentStaff::create([
            'establishment_id' => $establishment->id,
            'user_id' => $user->id,
            'role' => $data['role'],
        ]);

        return ['id' => $staff->id, 'name' => $user->name, 'email' => $user->email, 'role' => $staff->role];
    }
}
