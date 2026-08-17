<?php

namespace App\Http\Requests;

/** Changement de mot de passe d'un compte admin (obligatoire à la 1re connexion). */
class AdminPasswordRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:100', 'different:current_password'],
        ];
    }
}
