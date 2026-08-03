<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Traitement d'un ticket par le super-admin (réponse + statut). */
class RespondTicketRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // route protégée par le middleware admin
    }

    public function rules(): array
    {
        return [
            'response' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['open', 'in_progress', 'resolved'])],
        ];
    }
}
