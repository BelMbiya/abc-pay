<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// SÉCURITÉ : les champs de statut/sécurité (is_blocked, blocked_reason,
// sessions_revoked_at, profile_completed_at) sont VOLONTAIREMENT hors allowlist —
// ils ne se règlent que par affectation explicite côté services admin (anti mass-assignment).
#[Fillable([
    'name', 'email', 'phone', 'firebase_uid', 'password',
    'birth_date', 'gender', 'address', 'city', 'id_doc_type', 'id_doc_number',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'birth_date' => 'date',
            'profile_completed_at' => 'datetime',
            'is_blocked' => 'boolean',
            'sessions_revoked_at' => 'datetime',
            'kyc_submitted_at' => 'datetime',
            'kyc_reviewed_at' => 'datetime',
            'kyc_ocr_match' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }

    /** Champs d'identité (KYC) exigés pour considérer le profil « complet ». */
    public const REQUIRED_KYC = ['name', 'birth_date', 'gender', 'address', 'city', 'id_doc_type', 'id_doc_number'];

    /** Le profil contient-il toutes les infos d'identité exigées ? */
    public function hasCompleteKyc(): bool
    {
        foreach (self::REQUIRED_KYC as $field) {
            if (blank($this->{$field})) {
                return false;
            }
        }

        return true;
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}
