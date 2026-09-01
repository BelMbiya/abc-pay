<?php

namespace App\Http\Requests;

/** Réinitialisation du mot de passe d'un AUTRE administrateur (super-admin → `admins.manage`). */
class AdminResetPasswordRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // gate `admin.can:admins.manage` sur la route
    }

    public function rules(): array
    {
        return [
            'new_password' => ['required', 'string', 'min:8', 'max:100'],
        ];
    }
}
