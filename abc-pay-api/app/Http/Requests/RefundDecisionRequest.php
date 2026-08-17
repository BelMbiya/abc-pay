<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Décision sur une demande de remboursement (super-admin) : approuver ou rejeter. */
class RefundDecisionRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification admin portée par le middleware
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approuve', 'rejete'])],
            'note' => ['nullable', 'string', 'max:500'],
            // Forçage administrateur (force majeure) — exécute malgré un refus/attente établissement.
            'force' => ['nullable', 'boolean'],
        ];
    }
}
