<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Décision de l'administrateur sur un dossier KYC : approuver ou rejeter (avec motif). */
class KycDecisionRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification admin portée par le middleware
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'reason' => ['nullable', 'required_if:decision,reject', 'string', 'max:500'],
        ];
    }
}
