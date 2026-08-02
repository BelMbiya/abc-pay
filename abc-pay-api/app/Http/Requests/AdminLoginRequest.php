<?php

namespace App\Http\Requests;

class AdminLoginRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // connexion : publique par nature
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:160'],
            'password' => ['required', 'string', 'max:200'],
        ];
    }
}
