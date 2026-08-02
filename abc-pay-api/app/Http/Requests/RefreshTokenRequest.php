<?php

namespace App\Http\Requests;

class RefreshTokenRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // le refresh token lui-même fait foi
    }

    public function rules(): array
    {
        return [
            'refresh_token' => ['required', 'string'],
        ];
    }
}
