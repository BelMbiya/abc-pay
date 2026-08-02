<?php

namespace App\Services\Identity;

use App\Models\User;

/**
 * Domaine Identity — profil & KYC « infos seulement » du payeur.
 * SRP : mise à jour des informations d'identité + présentation (DTO), hors contrôleur.
 * Le profil devient « complet » (profile_completed_at) dès que toutes les infos exigées
 * sont renseignées — réutilisé pour préremplir, sur les reçus, et pour la conformité.
 */
class UserProfileService
{
    /**
     * @param  array<string, mixed>  $data  charge validée (UpdateProfileRequest)
     * @return array<string, mixed>
     */
    public function update(User $user, array $data): array
    {
        $user->fill($data);

        // Horodate la complétion du KYC dès que toutes les infos exigées sont présentes.
        if ($user->hasCompleteKyc() && ! $user->profile_completed_at) {
            $user->profile_completed_at = now();
        }

        $user->save();

        return $this->present($user->fresh());
    }

    /** DTO du profil (identité + statut KYC). */
    public function present(User $user): array
    {
        return [
            'id' => $user->id,
            'phone' => $user->phone,
            'name' => $user->name,
            'email' => $user->email,
            'birth_date' => $user->birth_date?->toDateString(),
            'gender' => $user->gender,
            'address' => $user->address,
            'city' => $user->city,
            'id_doc_type' => $user->id_doc_type,
            'id_doc_number' => $user->id_doc_number,
            'kyc_complete' => $user->hasCompleteKyc(),
            'is_blocked' => (bool) $user->is_blocked,
            'member_since' => $user->created_at?->toIso8601String(),
        ];
    }
}
