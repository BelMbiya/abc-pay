<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/** Décision de l'établissement sur un remboursement Tuition : valider ou refuser. */
class StaffRefundDecisionRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // authentification staff portée par le middleware
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approuve', 'refuse'])],
        ];
    }
}
