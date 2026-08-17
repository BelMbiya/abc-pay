<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/**
 * Mise à jour du suivi d'une demande de démo (super-admin) : avancement du statut
 * dans le pipeline commercial. Allowlist stricte : seul `status` est modifiable.
 */
class LeadUpdateRequest extends SecureFormRequest
{
    /** Étapes du pipeline de traitement d'une demande. */
    public const STATUSES = ['nouveau', 'contacte', 'qualifie', 'clos'];

    public function authorize(): bool
    {
        return true; // l'authentification admin est portée par le middleware
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(self::STATUSES)],
        ];
    }
}
