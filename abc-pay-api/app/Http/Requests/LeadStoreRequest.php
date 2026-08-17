<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/**
 * Demande de démo / partenariat depuis la landing — endpoint public (rate-limité).
 */
class LeadStoreRequest extends SecureFormRequest
{
    /** Canaux de reprise de contact proposés au prospect. */
    public const CHANNELS = ['whatsapp', 'email', 'appel'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'establishment_name' => ['required', 'string', 'max:150'],
            'contact_name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:40'],
            // Si le prospect demande à être recontacté par email, l'email devient requis.
            'email' => ['nullable', 'required_if:contact_channel,email', 'email', 'max:190'],
            'contact_channel' => ['nullable', Rule::in(self::CHANNELS)],
            'profile' => ['nullable', 'string', 'max:60'],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
