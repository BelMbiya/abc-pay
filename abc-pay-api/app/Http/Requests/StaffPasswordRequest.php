<?php

namespace App\Http\Requests;

/** Changement du mot de passe d'un compte staff (obligatoire à la 1re connexion). */
class StaffPasswordRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification staff portée par le middleware
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:100', 'different:current_password'],
        ];
    }
}
