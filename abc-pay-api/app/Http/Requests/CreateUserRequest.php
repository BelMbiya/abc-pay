<?php

namespace App\Http\Requests;

/** Création d'un compte utilisateur (particulier) par le super-admin. */
class CreateUserRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // route protégée par le middleware admin
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?\d{9,15}$/', 'unique:users,phone'],
            'name' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:160', 'unique:users,email'],
        ];
    }
}
