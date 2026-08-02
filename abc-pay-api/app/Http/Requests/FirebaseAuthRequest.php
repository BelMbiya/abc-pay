<?php

namespace App\Http\Requests;

class FirebaseAuthRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification : public par nature
    }

    public function rules(): array
    {
        return [
            'firebase_id_token' => ['required', 'string', 'max:4096'],
        ];
    }
}
