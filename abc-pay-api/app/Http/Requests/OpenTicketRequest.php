<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Ouverture d'un ticket de support par le payeur authentifié (allowlist stricte). */
class OpenTicketRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // route protégée par le middleware jwt
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(['dispute', 'compromised', 'lost_device', 'access', 'other'])],
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'max:2000'],
            'tx_reference' => ['nullable', 'string', 'max:60'],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high'])],
        ];
    }
}
