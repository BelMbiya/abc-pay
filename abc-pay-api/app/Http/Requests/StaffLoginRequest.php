<?php

namespace App\Http\Requests;

class StaffLoginRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // connexion : public par nature
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:160'],
            'password' => ['required', 'string', 'max:200'],
        ];
    }
}
