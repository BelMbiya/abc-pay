<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

/**
 * Filtres de la vue plateforme des transactions (super-admin). Allowlist stricte :
 * chaque critère est validé ; tout paramètre non déclaré est ignoré via validated().
 */
class AdminTransactionSearchRequest extends SecureFormRequest
{
    public function authorize(): bool
    {
        return true; // l'authentification admin est portée par le middleware
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'type' => ['nullable', Rule::in(['tuition', 'send', 'receive', 'service', 'refund'])],
            'direction' => ['nullable', Rule::in(['debit', 'credit'])],
            'status' => ['nullable', 'string', 'max:30'],
            'channel' => ['nullable', 'string', 'max:30'],
            'establishment_id' => ['nullable', 'uuid'],
            'scope' => ['nullable', Rule::in(['establishment', 'user'])],
            'registered' => ['nullable', 'boolean'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'amount_min' => ['nullable', 'numeric', 'min:0'],
            'amount_max' => ['nullable', 'numeric', 'min:0', 'gte:amount_min'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
